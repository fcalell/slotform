import { spawn } from "node:child_process";
import { accessSync, constants, readFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

// The Chrome process and the CDP client: docs/architecture/plugins/screens.md, "Shared browser".

const LAUNCH_TIMEOUT = 20_000;
const CONNECT_TIMEOUT = 10_000;

const NAMES = ["chromium", "google-chrome", "google-chrome-stable"];

export const NO_CHROME =
	"no Chrome found: install chromium or google-chrome, or set CHROME_PATH to a Chrome executable";

// The Chrome to launch: `CHROME_PATH`, else the first of the usual names on
// PATH. One actionable line when there is none.
export function findChrome(
	env: NodeJS.ProcessEnv,
	executable: (path: string) => boolean = isExecutable,
): string {
	const chosen = env.CHROME_PATH;
	if (chosen) {
		if (executable(chosen)) return chosen;
		throw new Error(
			`CHROME_PATH ${chosen} is not an executable: point it at a Chrome, or unset it to use chromium or google-chrome from PATH`,
		);
	}
	const dirs = (env.PATH ?? "").split(delimiter).filter(Boolean);
	for (const name of NAMES) {
		for (const dir of dirs) {
			const path = join(dir, name);
			if (executable(path)) return path;
		}
	}
	throw new Error(NO_CHROME);
}

function isExecutable(path: string): boolean {
	try {
		accessSync(path, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

const CHROME_ARGS = [
	"--headless=new",
	"--no-sandbox",
	"--hide-scrollbars",
	"--font-render-hinting=none",
	"--no-first-run",
	// A hovering fine pointer: headless Chrome reports no hover without it, so
	// hover-gated styles would never draw.
	"--blink-settings=primaryHoverType=2,primaryPointerType=4",
];

export const hasCode = (error: unknown, code: string): boolean =>
	error instanceof Error && "code" in error && error.code === code;

// Starts Chrome detached on a free debugging port with its own profile, and
// resolves with the port it chose, which it writes to `DevToolsActivePort`.
export async function launchChrome(
	executable: string,
	userDataDir: string,
	env: NodeJS.ProcessEnv,
): Promise<{ port: number; pid: number }> {
	const child = spawn(
		executable,
		[
			...CHROME_ARGS,
			"--remote-debugging-port=0",
			`--user-data-dir=${userDataDir}`,
			"about:blank",
		],
		{ detached: true, stdio: "ignore", env },
	);
	let exited: string | undefined;
	child.on("exit", (code, signal) => {
		exited = `exited with ${code ?? signal}`;
	});
	const spawnFailure = new Promise<never>((_, reject) =>
		child.on("error", (error) =>
			reject(new Error(`cannot start ${executable}: ${error.message}`)),
		),
	);
	const portFile = join(userDataDir, "DevToolsActivePort");
	const ready = (async () => {
		const end = Date.now() + LAUNCH_TIMEOUT;
		while (Date.now() < end) {
			if (exited) throw new Error(`${executable} ${exited} before it listened`);
			// Chrome announces its port only by writing this file.
			try {
				const port = Number(readFileSync(portFile, "utf8").split("\n")[0]);
				if (port > 0) return port;
			} catch (error) {
				if (!hasCode(error, "ENOENT")) throw error;
			}
			await sleep(50);
		}
		throw new Error(
			`${executable} did not open its debugging port within ${LAUNCH_TIMEOUT} ms`,
		);
	})();
	try {
		const port = await Promise.race([ready, spawnFailure]);
		const { pid } = child;
		if (pid === undefined) throw new Error(`cannot start ${executable}`);
		child.unref();
		return { port, pid };
	} catch (error) {
		child.kill("SIGKILL");
		throw error;
	}
}

// `Handler` and `Pending` take `never` so a caller's own type for an event or a
// reply fits; the JSON's `any` meets them through a cast.
type Handler = (params: never, sessionId: string | undefined) => void;

interface Pending {
	method: string;
	sessionId: string | undefined;
	resolve: (value: never) => void;
	reject: (error: Error) => void;
	timer: NodeJS.Timeout;
}

const CALL_TIMEOUT = 30_000;

// One connection to Chrome's browser endpoint. A call to a tab names its
// `sessionId` (flat sessions); `Tab` binds it. A tab that crashes or detaches
// fails its pending calls at once, and every call to it after.
export class Cdp {
	private id = 0;
	private pending = new Map<number, Pending>();
	private handlers = new Set<{ method: string; handler: Handler }>();
	// Why each ended session ended.
	private ends = new Map<string, string>();
	closed = false;

	private socket: WebSocket;

	private constructor(socket: WebSocket) {
		this.socket = socket;
		socket.addEventListener("message", (event) => {
			const message = JSON.parse(String(event.data));
			if (message.id !== undefined) {
				const call = this.pending.get(message.id);
				if (!call) return;
				this.pending.delete(message.id);
				clearTimeout(call.timer);
				if (message.error)
					call.reject(
						new Error(`CDP ${call.method}: ${message.error.message}`),
					);
				else call.resolve(message.result as never);
				return;
			}
			for (const { method, handler } of this.handlers)
				if (method === message.method)
					handler(message.params as never, message.sessionId);
		});
		socket.addEventListener("close", () => this.fail("the connection closed"));
		socket.addEventListener("error", () => this.fail("the connection failed"));
		this.on("Target.detachedFromTarget", (params: { sessionId: string }) =>
			this.end(params.sessionId, "the tab closed"),
		);
		// A tab's own event: flat sessions always name it.
		this.on("Inspector.targetCrashed", (_, sessionId) => {
			if (sessionId) this.end(sessionId, "the tab crashed");
		});
	}

	static connect(url: string): Promise<Cdp> {
		return new Promise((resolve, reject) => {
			const socket = new WebSocket(url);
			const timer = setTimeout(() => {
				socket.close();
				reject(
					new Error(
						`CDP connect to ${url} timed out after ${CONNECT_TIMEOUT} ms`,
					),
				);
			}, CONNECT_TIMEOUT);
			socket.addEventListener("open", () => {
				clearTimeout(timer);
				resolve(new Cdp(socket));
			});
			socket.addEventListener("error", () => {
				clearTimeout(timer);
				reject(new Error(`CDP connect to ${url} failed`));
			});
		});
	}

	private fail(reason: string): void {
		this.closed = true;
		this.reject(() => true, reason);
	}

	// A crash, then the detach that follows it, keeps the first reason.
	private end(sessionId: string, reason: string): void {
		if (this.ends.has(sessionId)) return;
		this.ends.set(sessionId, reason);
		this.reject((call) => call.sessionId === sessionId, reason);
	}

	private reject(which: (call: Pending) => boolean, reason: string): void {
		for (const [id, call] of this.pending) {
			if (!which(call)) continue;
			clearTimeout(call.timer);
			this.pending.delete(id);
			call.reject(new Error(`CDP ${call.method}: ${reason}`));
		}
	}

	// Why the tab on `sessionId` ended, or undefined while it lives.
	ended(sessionId: string): string | undefined {
		return this.ends.get(sessionId);
	}

	send<T = unknown>(
		method: string,
		params: object = {},
		options: { sessionId?: string; timeout?: number } = {},
	): Promise<T> {
		if (this.closed)
			return Promise.reject(
				new Error(`CDP ${method}: the connection is closed`),
			);
		const ended = options.sessionId && this.ends.get(options.sessionId);
		if (ended) return Promise.reject(new Error(`CDP ${method}: ${ended}`));
		const id = ++this.id;
		const timeout = options.timeout ?? CALL_TIMEOUT;
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`CDP ${method} timed out after ${timeout} ms`));
			}, timeout);
			this.pending.set(id, {
				method,
				sessionId: options.sessionId,
				resolve,
				reject,
				timer,
			});
			this.socket.send(
				JSON.stringify({ id, method, params, sessionId: options.sessionId }),
			);
		});
	}

	on(method: string, handler: Handler): () => void {
		const entry = { method, handler };
		this.handlers.add(entry);
		return () => this.handlers.delete(entry);
	}

	close(): void {
		this.closed = true;
		this.socket.close();
	}
}

// The browser endpoint of a Chrome on `port`, or undefined when nothing
// answers there within `timeout`.
export async function browserUrl(
	port: number,
	timeout = 2000,
): Promise<string | undefined> {
	try {
		const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
			signal: AbortSignal.timeout(timeout),
		});
		const body: unknown = await response.json();
		return typeof body === "object" &&
			body !== null &&
			"webSocketDebuggerUrl" in body &&
			typeof body.webSocketDebuggerUrl === "string"
			? body.webSocketDebuggerUrl
			: undefined;
	} catch {
		return undefined;
	}
}
