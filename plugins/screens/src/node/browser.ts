import { spawnSync } from "node:child_process";
import {
	closeSync,
	mkdirSync,
	openSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
	writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	browserUrl,
	Cdp,
	findChrome,
	hasCode,
	launchChrome,
	sleep,
} from "./chrome.ts";
import { Tab } from "./tab.ts";

// The shared Chrome: docs/architecture/plugins/screens.md, "Shared browser".

interface BrowserState {
	port: number;
	pid: number;
	// Set by `stack screens browser`: the browser stays after its last context.
	kept?: true;
}

export const stateDir = (
	env: Record<string, string | undefined> = process.env,
): string => join(env.XDG_RUNTIME_DIR || tmpdir(), "stack");

const files = () => {
	const dir = stateDir();
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

const readState = (): BrowserState | undefined => {
	try {
		return parseState(readFileSync(files().state, "utf8"));
	} catch {
		return undefined;
	}
};

async function withLock<T>(body: () => Promise<T>): Promise<T> {
	const { dir, lock } = files();
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
					rmSync(lock, { force: true });
					continue;
				}
			} catch (inner) {
				// The holder released it between the two reads: take it again.
				if (!hasCode(inner, "ENOENT")) throw inner;
				continue;
			}
			if (Date.now() > end)
				throw new Error(
					`the browser lock ${lock} is held by another process; remove it if no stack screens command is running`,
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

// The running browser's endpoint, or undefined when the state file is stale
// (its process is gone or its port does not answer).
async function liveUrl(
	state: BrowserState | undefined,
): Promise<string | undefined> {
	if (!state || !pidAlive(state.pid)) return undefined;
	return browserUrl(state.port);
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
function isProfileChrome(pid: number, profile: string): boolean {
	const ps = spawnSync("ps", ["-ww", "-o", "command=", "-p", String(pid)], {
		encoding: "utf8",
	});
	if (ps.error) throw ps.error;
	return runsProfile(ps.stdout, profile);
}

function discard(state: BrowserState | undefined): void {
	const { state: file, profile } = files();
	if (state && isProfileChrome(state.pid, profile)) {
		try {
			process.kill(state.pid, "SIGKILL");
		} catch {
			// The process may exit between the check and the kill.
		}
	}
	rmSync(file, { force: true });
	rmSync(profile, { recursive: true, force: true });
}

// The browser's endpoint, started when none runs.
const ensure = (kept: boolean): Promise<string> =>
	withLock(async () => {
		const state = readState();
		const url = await liveUrl(state);
		if (url) {
			if (kept && !state?.kept)
				writeFileSync(files().state, JSON.stringify({ ...state, kept: true }));
			return url;
		}
		discard(state);
		const { profile, state: file } = files();
		const { port, pid } = await launchChrome(findChrome(), profile);
		writeFileSync(
			file,
			JSON.stringify(kept ? { port, pid, kept: true } : { port, pid }),
		);
		const started = await browserUrl(port, 10_000);
		if (!started) throw new Error(`Chrome on port ${port} does not answer`);
		return started;
	});

export async function startBrowser(): Promise<BrowserState> {
	await ensure(true);
	// `ensure` wrote or confirmed the state file.
	return readState() as BrowserState;
}

// What `stack screens browser stop` does: end the shared browser. False when
// none was running.
export async function stopBrowser(): Promise<boolean> {
	return withLock(async () => {
		const state = readState();
		const url = await liveUrl(state);
		if (!state || !url) {
			discard(state);
			return false;
		}
		try {
			const cdp = await Cdp.connect(url);
			// Chrome may close the socket before it answers.
			await cdp.send("Browser.close", {}, { timeout: 5000 }).catch(() => {});
			cdp.close();
		} catch {
			// A browser that does not answer is killed by `discard` below.
		}
		// The browser is no child of this process: no exit event to wait on.
		for (let i = 0; i < 50 && pidAlive(state.pid); i++) await sleep(100);
		discard(state);
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

	dispose(): Promise<unknown> {
		// The context is gone already when its browser closed first.
		return this.cdp
			.send("Target.disposeBrowserContext", {
				browserContextId: this.contextId,
			})
			.catch(() => {});
	}
}

// A command's connection to the shared browser.
export class Lease {
	private scopes: Scope[] = [];
	private releasing: Promise<void> | undefined;

	private cdp: Cdp;

	constructor(cdp: Cdp) {
		this.cdp = cdp;
	}

	get connection(): Cdp {
		return this.cdp;
	}

	async context(): Promise<Scope> {
		const { browserContextId } = await this.cdp.send<{
			browserContextId: string;
		}>("Target.createBrowserContext", { disposeOnDetach: true });
		const scope = new Scope(this.cdp, browserContextId);
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
		await Promise.all(this.scopes.map((scope) => scope.dispose()));
		// Releasing is best effort: a lock timeout must not fail a command that
		// already finished.
		await withLock(async () => {
			if (this.cdp.closed || readState()?.kept) return;
			const { browserContextIds } = await this.cdp
				.send<{ browserContextIds: string[] }>("Target.getBrowserContexts")
				// A browser that cannot say what it holds stays up.
				.catch(() => ({ browserContextIds: ["unknown"] }));
			if (browserContextIds.length > 0) return;
			const state = readState();
			rmSync(files().state, { force: true });
			// Chrome may close the socket before it answers.
			await this.cdp
				.send("Browser.close", {}, { timeout: 5000 })
				.catch(() => {});
			// The browser is no child of this process: no exit event to wait on.
			for (let i = 0; state && i < 50 && pidAlive(state.pid); i++)
				await sleep(100);
			rmSync(files().profile, { recursive: true, force: true });
		}).catch(() => {});
		this.cdp.close();
	}
}

// Connects to the shared browser, starting one when none runs. A connect that
// fails because the browser has just closed starts it once more.
export async function openLease(): Promise<Lease> {
	let last: unknown;
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const url = await ensure(false);
			return new Lease(await Cdp.connect(url));
		} catch (error) {
			last = error;
		}
	}
	throw last;
}

// Runs `body` with a lease it releases at the end, on failure, and on SIGINT
// or SIGTERM.
export async function withLease<T>(
	body: (lease: Lease) => Promise<T>,
): Promise<T> {
	const lease = await openLease();
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
