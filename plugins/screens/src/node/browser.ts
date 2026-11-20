import { spawnSync } from "node:child_process";
import {
	closeSync,
	linkSync,
	mkdirSync,
	openSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
	writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import {
	browserUrl,
	Cdp,
	findChrome,
	hasCode,
	launchChrome,
} from "./chrome.ts";
import { Tab } from "./tab.ts";

// The shared Chrome: docs/architecture/plugins/screens.md, "Shared browser".

interface BrowserState {
	port: number;
	pid: number;
	// Set by `slotform screens browser`: the browser stays after its last context.
	kept?: true;
}

export const stateDir = (env: NodeJS.ProcessEnv): string =>
	join(env.XDG_RUNTIME_DIR || tmpdir(), "slotform");

const files = (env: NodeJS.ProcessEnv) => {
	const dir = stateDir(env);
	return {
		dir,
		state: join(dir, "chrome.json"),
		lock: join(dir, "chrome.lock"),
		profile: join(dir, "chrome-profile"),
	};
};

export function parseState(text: string): BrowserState | undefined {
	try {
		const value: unknown = JSON.parse(text);
		if (typeof value !== "object" || value === null) return undefined;
		if (!("port" in value) || !("pid" in value)) return undefined;
		const { port, pid } = value;
		if (typeof port !== "number" || !Number.isInteger(port)) return undefined;
		if (typeof pid !== "number" || !Number.isInteger(pid)) return undefined;
		return "kept" in value && value.kept === true
			? { port, pid, kept: true }
			: { port, pid };
	} catch {
		return undefined;
	}
}

// A lock file holds its owner's pid. It is stale when that process is gone, or,
// while the pid is not yet written, when it is older than 10 s.
export function lockIsStale(
	content: string,
	ageMs: number,
	alive: (pid: number) => boolean,
): boolean {
	const pid = Number(content);
	return Number.isInteger(pid) && pid > 0 ? !alive(pid) : ageMs > 10_000;
}

function pidAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

const readState = (env: NodeJS.ProcessEnv): BrowserState | undefined => {
	try {
		return parseState(readFileSync(files(env).state, "utf8"));
	} catch {
		return undefined;
	}
};

// Removes a lock judged stale. Two processes may judge the same stale lock at
// once, and a fresh lock may replace it before the second acts: the rename
// moves whatever lock is there to this process alone, and what it moved is
// judged again, so a fresh one is put back. A third process that takes the
// empty path in that instant makes the put-back fail with EEXIST, and this
// command with it.
function clearStale(lock: string): void {
	const moved = `${lock}.${process.pid}`;
	renameSync(lock, moved);
	try {
		const age = Date.now() - statSync(moved).mtimeMs;
		if (!lockIsStale(readFileSync(moved, "utf8"), age, pidAlive))
			linkSync(moved, lock);
	} finally {
		rmSync(moved, { force: true });
	}
}

async function withLock<T>(
	env: NodeJS.ProcessEnv,
	body: () => Promise<T>,
): Promise<T> {
	const { dir, lock } = files(env);
	mkdirSync(dir, { recursive: true });
	const end = Date.now() + 60_000;
	for (;;) {
		try {
			const fd = openSync(lock, "wx");
			writeSync(fd, String(process.pid));
			closeSync(fd);
			break;
		} catch (error) {
			if (!hasCode(error, "EEXIST")) throw error;
			try {
				const age = Date.now() - statSync(lock).mtimeMs;
				if (lockIsStale(readFileSync(lock, "utf8"), age, pidAlive)) {
					clearStale(lock);
					continue;
				}
			} catch (inner) {
				// The holder released it, or another process cleared it, between
				// the reads: take it again.
				if (!hasCode(inner, "ENOENT")) throw inner;
				continue;
			}
			if (Date.now() > end)
				throw new Error(
					`the browser lock ${lock} is held by another process; remove it if no slotform screens command is running`,
				);
			// Another process holds the lock: nothing signals its release.
			await sleep(50);
		}
	}
	try {
		return await body();
	} finally {
		rmSync(lock, { force: true });
	}
}

// How long a Chrome has to answer on its port, started or busy, before it
// counts as gone: a busy one may take seconds, and one judged gone is killed.
const ANSWER_TIMEOUT = 10_000;

// The running browser's endpoint, or undefined when the state file is stale
// (its process is gone or its port does not answer).
async function liveUrl(
	state: BrowserState | undefined,
): Promise<string | undefined> {
	if (!state || !pidAlive(state.pid)) return undefined;
	return browserUrl(state.port, ANSWER_TIMEOUT);
}

// Whether a process's command line (as `ps` prints it, its arguments joined
// by spaces) is a Chrome on `profile`: a stale state's pid may since belong to
// another process. The argument is matched whole, so a profile path that
// holds a space still matches and a longer one does not.
export function runsProfile(command: string, profile: string): boolean {
	return ` ${command.trim()} `.includes(` --user-data-dir=${profile} `);
}

// Whether `pid` is the Chrome on `profile`. `ps` reads a command line the same
// way on Linux and macOS; `-ww` keeps it whole, and a pid that is gone prints
// nothing.
function isProfileChrome(
	pid: number,
	profile: string,
	env: NodeJS.ProcessEnv,
): boolean {
	const ps = spawnSync("ps", ["-ww", "-o", "command=", "-p", String(pid)], {
		encoding: "utf8",
		env,
	});
	if (ps.error) throw ps.error;
	return runsProfile(ps.stdout, profile);
}

function discard(
	env: NodeJS.ProcessEnv,
	state: BrowserState | undefined,
): void {
	const { state: file, profile } = files(env);
	if (state && isProfileChrome(state.pid, profile, env)) {
		try {
			process.kill(state.pid, "SIGKILL");
		} catch {
			// The process may exit between the check and the kill.
		}
	}
	rmSync(file, { force: true });
	rmSync(profile, { recursive: true, force: true });
}

// The browser's endpoint, started when none runs. The caller holds the lock.
async function ensure(env: NodeJS.ProcessEnv, kept: boolean): Promise<string> {
	const state = readState(env);
	const url = await liveUrl(state);
	if (url) {
		if (kept && !state?.kept)
			writeFileSync(files(env).state, JSON.stringify({ ...state, kept: true }));
		return url;
	}
	discard(env, state);
	const { profile, state: file } = files(env);
	const { port, pid } = await launchChrome(findChrome(env), profile, env);
	writeFileSync(
		file,
		JSON.stringify(kept ? { port, pid, kept: true } : { port, pid }),
	);
	const started = await browserUrl(port, ANSWER_TIMEOUT);
	if (!started) throw new Error(`Chrome on port ${port} does not answer`);
	return started;
}

export const startBrowser = (env: NodeJS.ProcessEnv): Promise<BrowserState> =>
	withLock(env, async () => {
		await ensure(env, true);
		// `ensure` wrote or confirmed the state file.
		return readState(env) as BrowserState;
	});

// False when no browser was running.
export async function stopBrowser(env: NodeJS.ProcessEnv): Promise<boolean> {
	return withLock(env, async () => {
		const state = readState(env);
		const url = await liveUrl(state);
		if (!state || !url) {
			discard(env, state);
			return false;
		}
		try {
			const cdp = await Cdp.connect(url);
			await cdp
				.send("Browser.close", {}, { timeout: 5000 })
				.catch(ignoreClosed(cdp));
			cdp.close();
		} catch {
			// A browser that does not answer is killed by `discard` below.
		}
		// The browser is no child of this process: no exit event to wait on.
		for (let i = 0; i < 50 && pidAlive(state.pid); i++) await sleep(100);
		discard(env, state);
		return true;
	});
}

// One browser context of a command: its tabs are isolated from every other
// context's, so commands running at once share the browser and nothing else.
export class Scope {
	private cdp: Cdp;
	readonly contextId: string;

	constructor(cdp: Cdp, contextId: string) {
		this.cdp = cdp;
		this.contextId = contextId;
	}

	async tab(): Promise<Tab> {
		const { targetId } = await this.cdp.send<{ targetId: string }>(
			"Target.createTarget",
			{
				url: "about:blank",
				browserContextId: this.contextId,
			},
		);
		const { sessionId } = await this.cdp.send<{ sessionId: string }>(
			"Target.attachToTarget",
			{
				targetId,
				flatten: true,
			},
		);
		return Tab.open(this.cdp, sessionId, targetId);
	}

	async dispose(): Promise<void> {
		await this.cdp
			.send("Target.disposeBrowserContext", {
				browserContextId: this.contextId,
			})
			.catch(ignoreClosed(this.cdp));
	}
}

// A failure of a call to a browser that has closed, which a call made to end it
// expects: the context is gone with it, and Chrome may close the socket before
// it answers `Browser.close`. Any other failure stands.
const ignoreClosed = (cdp: Cdp) => (error: unknown) => {
	if (!cdp.closed) throw error;
};

async function newScope(cdp: Cdp): Promise<Scope> {
	const { browserContextId } = await cdp.send<{ browserContextId: string }>(
		"Target.createBrowserContext",
		{ disposeOnDetach: true },
	);
	return new Scope(cdp, browserContextId);
}

// A command's connection to the shared browser. It holds a context of its own
// from open to release, so another command's last-one-out check never closes
// the browser between this connect and this command's first context.
export class Lease {
	private scopes: Scope[];
	private releasing: Promise<void> | undefined;

	private cdp: Cdp;
	private env: NodeJS.ProcessEnv;

	constructor(cdp: Cdp, held: Scope, env: NodeJS.ProcessEnv) {
		this.cdp = cdp;
		this.env = env;
		this.scopes = [held];
	}

	async context(): Promise<Scope> {
		const scope = await newScope(this.cdp);
		this.scopes.push(scope);
		return scope;
	}

	// Disposes every context, then closes the browser when this command started
	// it and no other command holds a context. A second call waits for the
	// first, so a signal's release and the command's own end finish together.
	release(): Promise<void> {
		this.releasing ??= this.dispose();
		return this.releasing;
	}

	private async dispose(): Promise<void> {
		try {
			await Promise.all(this.scopes.map((scope) => scope.dispose()));
			await withLock(this.env, async () => {
				if (this.cdp.closed || readState(this.env)?.kept) return;
				const { browserContextIds } = await this.cdp
					.send<{ browserContextIds: string[] }>("Target.getBrowserContexts")
					// A browser that cannot say what it holds stays up.
					.catch(() => ({ browserContextIds: ["unknown"] }));
				if (browserContextIds.length > 0) return;
				const state = readState(this.env);
				rmSync(files(this.env).state, { force: true });
				await this.cdp
					.send("Browser.close", {}, { timeout: 5000 })
					.catch(ignoreClosed(this.cdp));
				// The browser is no child of this process: no exit event to wait on.
				for (let i = 0; state && i < 50 && pidAlive(state.pid); i++)
					await sleep(100);
				rmSync(files(this.env).profile, { recursive: true, force: true });
			});
		} catch (error) {
			// A command that already finished does not fail on its release: the
			// line says the browser may be left running.
			console.error(
				`slotform screens: the shared browser was not released: ${error instanceof Error ? error.message : String(error)}`,
			);
		} finally {
			this.cdp.close();
		}
	}
}

// Connects to the shared browser, starting one when none runs, and opens the
// lease's own context under the same lock as the start.
export const openLease = (env: NodeJS.ProcessEnv): Promise<Lease> =>
	withLock(env, async () => {
		const cdp = await Cdp.connect(await ensure(env, false));
		try {
			return new Lease(cdp, await newScope(cdp), env);
		} catch (error) {
			cdp.close();
			throw error;
		}
	});

// Runs `body` with a lease it releases at the end, on failure, and on SIGINT
// or SIGTERM.
export async function withLease<T>(
	env: NodeJS.ProcessEnv,
	body: (lease: Lease) => Promise<T>,
): Promise<T> {
	const lease = await openLease(env);
	const onSignal = (signal: NodeJS.Signals) => {
		void lease
			.release()
			.finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
	};
	process.once("SIGINT", onSignal);
	process.once("SIGTERM", onSignal);
	try {
		return await body(lease);
	} finally {
		process.off("SIGINT", onSignal);
		process.off("SIGTERM", onSignal);
		await lease.release();
	}
}
