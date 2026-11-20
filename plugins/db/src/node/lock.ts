import {
	closeSync,
	linkSync,
	mkdirSync,
	openSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeSync,
} from "node:fs";
import { uptime } from "node:os";
import { dirname, join } from "node:path";
import { DB_KIT_DIR } from "./layout.ts";

// Cross-process and in-process migration lock: docs/architecture/plugins/db.md, "Migration lock".

interface LockHandle {
	readonly path: string;
	release(): void;
}

// In-process serialization. Keyed on the absolute lock path so two
// concurrent operations targeting different cwds don't queue against
// each other.
const inProcessQueue = new Map<string, Promise<unknown>>();

// Track lock files this process holds so an exit, including one on an uncaught
// exception (which emits `exit`), SIGINT or SIGTERM, doesn't leave a stale file
// blocking the next run.
const heldLocks = new Set<string>();
let exitHandlersInstalled = false;

function installExitHandlers(): void {
	if (exitHandlersInstalled) return;
	exitHandlersInstalled = true;
	const cleanup = () => {
		for (const path of heldLocks) {
			try {
				removeIfOwned(path);
			} catch {
				// Best-effort: nothing else we can do during shutdown.
			}
		}
		heldLocks.clear();
	};
	process.once("exit", cleanup);
	// A process with a handler of its own for the signal (a long-lived command
	// that shuts itself down) ends itself; without one this ends it.
	for (const [signal, code] of [
		["SIGINT", 130],
		["SIGTERM", 143],
	] as const) {
		process.once(signal, () => {
			cleanup();
			if (process.listenerCount(signal) === 0) process.exit(code);
		});
	}
}

function errnoCode(err: unknown): string | undefined {
	return err instanceof Error && "code" in err && typeof err.code === "string"
		? err.code
		: undefined;
}

// A lock a user deleted and another process took holds that process's PID:
// removing it would release the other process's lock.
function removeIfOwned(path: string): void {
	if (readFileSync(path, "utf-8").trim() === String(process.pid)) {
		rmSync(path, { force: true });
	}
}

// A writer killed between creating the file and writing its PID leaves it
// empty; a lock older than the boot survives a reboot, where its PID may
// belong to an unrelated live process.
const EMPTY_LOCK_STALE_MS = 5000;

function isStale(path: string): boolean {
	const { mtimeMs } = statSync(path);
	if (mtimeMs < Date.now() - uptime() * 1000) return true;
	const contents = readFileSync(path, "utf-8").trim();
	if (contents === "") return Date.now() - mtimeMs > EMPTY_LOCK_STALE_MS;
	return !pidIsAlive(Number.parseInt(contents, 10));
}

function pidIsAlive(pid: number): boolean {
	if (!Number.isFinite(pid) || pid <= 0) return false;
	try {
		// `kill(pid, 0)` is the POSIX-portable liveness check. ESRCH means
		// the process is gone; EPERM means it's alive but we can't signal
		// it (still counts as alive for our purposes — don't steal).
		process.kill(pid, 0);
		return true;
	} catch (err) {
		return errnoCode(err) === "EPERM";
	}
}

// Two processes can find the same stale lock. Each moves it aside under a name
// of its own (a rename is atomic, so one of them moves it) and discards what it
// moved only while that is still stale: a reclaimer that moved the fresh lock
// the other just created links it back. The link fails rather than overwrite
// a lock a third process took in that window, which then holds beside it.
function reclaim(path: string): void {
	const aside = `${path}.${process.pid}.stale`;
	try {
		renameSync(path, aside);
	} catch (err) {
		if (errnoCode(err) === "ENOENT") return;
		throw err;
	}
	try {
		if (!isStale(aside)) linkSync(aside, path);
	} catch (err) {
		if (errnoCode(err) !== "EEXIST") throw err;
	} finally {
		rmSync(aside, { force: true });
	}
}

// A lock that is taken returns null, and the caller polls again; a stale one
// (a dead PID, an empty file or a lock from before the boot) is reclaimed first.
function tryAcquire(path: string): LockHandle | null {
	mkdirSync(dirname(path), { recursive: true });
	let fd: number;
	try {
		fd = openSync(path, "wx");
	} catch (err) {
		if (errnoCode(err) !== "EEXIST") throw err;
		let stale: boolean;
		try {
			stale = isStale(path);
		} catch (inspect) {
			// Released between the open and the inspection: the next poll takes it.
			if (errnoCode(inspect) === "ENOENT") return null;
			throw inspect;
		}
		if (stale) reclaim(path);
		return null;
	}
	writeSync(fd, String(process.pid));
	closeSync(fd);
	heldLocks.add(path);
	return {
		path,
		release() {
			if (!heldLocks.has(path)) return;
			heldLocks.delete(path);
			try {
				removeIfOwned(path);
			} catch {
				// Already gone; nothing to do.
			}
		},
	};
}

// How long a writer waits for the lock: covers a slow `drizzle-kit generate`
// on a large schema while still surfacing a wedged lock within a single CI
// step.
const LOCK_TIMEOUT_MS = 30_000;

// Polls the lock file: another process releasing it by deleting the file
// signals nothing this process can wait on. The backoff cap is short enough
// to keep `slotform dev` responsive and long enough to avoid busy-spin under
// contention. No lock should normally be held more than a few seconds; the
// timeout guards against a wedged process leaving the lock file behind.
async function waitFor(path: string): Promise<LockHandle> {
	const start = Date.now();
	let delay = 25;
	while (true) {
		const handle = tryAcquire(path);
		if (handle) return handle;
		if (Date.now() - start > LOCK_TIMEOUT_MS) {
			throw new Error(
				`db: timed out after ${LOCK_TIMEOUT_MS}ms waiting for migration lock at \`${path}\`. ` +
					`Another process appears to be holding it. If you're sure no other migration writer is running, ` +
					`delete the file and retry.`,
			);
		}
		await new Promise((r) => setTimeout(r, delay));
		delay = Math.min(delay * 2, 250);
	}
}

// Runs `task` while holding the migration lock at `lockPath`: the in-process
// queue first (same-process serialization), the file lock second
// (cross-process exclusion). Both are released, in reverse order, even if the
// task throws.
export async function withMigrationLock<T>(
	lockPath: string,
	task: () => Promise<T>,
): Promise<T> {
	installExitHandlers();

	// In-process queue: chain off the prior promise for this lockPath so
	// same-process callers serialize without spinning on the file lock.
	const prior = inProcessQueue.get(lockPath) ?? Promise.resolve();
	const run = async () => {
		const handle = await waitFor(lockPath);
		try {
			return await task();
		} finally {
			handle.release();
		}
	};
	// Wrap with a `.catch()` so a single rejected operation doesn't poison
	// the queue for every later caller — they should each be free to retry.
	const tailMarker = prior.then(run, run);
	inProcessQueue.set(lockPath, tailMarker);
	try {
		return await tailMarker;
	} finally {
		// Clear the entry only if we're still the tail; otherwise a later
		// caller has already chained on top of us and we'd evict their
		// place in line. Bounds the Map for long-lived processes (`slotform
		// dev`) without breaking serialization.
		if (inProcessQueue.get(lockPath) === tailMarker) {
			inProcessQueue.delete(lockPath);
		}
	}
}

export function migrationLockPath(cwd: string): string {
	return join(cwd, DB_KIT_DIR, "migration.lock");
}
