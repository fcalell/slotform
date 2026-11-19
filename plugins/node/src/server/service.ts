import type { Register } from "@fcalell/plugin-api/procedure";
import type { ServiceLogger } from "./log.ts";
import type { NodeWorker } from "./worker.ts";
import type { ConnectionSession, WsHub } from "./ws-hub.ts";

export interface ServiceHttp {
	// The port the node server listens on (fixed from config before listen).
	port: number;
	// Route every request whose path equals `prefix` or starts with
	// `prefix + "/"` to `handler`. Longest registered prefix wins; an exact
	// duplicate prefix throws. Paths are not rewritten.
	mount(
		prefix: string,
		handler: (request: Request) => Response | Promise<Response>,
	): void;
	// The session the request's credentials hold, null when there is none.
	// Route sessions: docs/architecture/plugins/node.md, "Service route sessions".
	session(request: Request): Promise<ConnectionSession | null>;
}

export interface ServiceContext {
	log: ServiceLogger;
	// The typed WebSocket hub: register channels with `ws.channel(def, ...)`
	// and broadcast through the returned handle.
	ws: WsHub;
	// Raw fetch-style route mounts and the listen port, for services that host
	// their own HTTP surface (e.g. an in-process MCP server).
	http: ServiceHttp;
	// The worker's job context, built afresh on each call; null when the app has
	// no worker. Typed by the app's registered `JobContext` where one is
	// registered: docs/architecture/plugins/node.md, "Services".
	jobContext: Register extends { jobContext: infer TContext }
		? () => Promise<TContext>
		: (() => ReturnType<NodeWorker["jobContext"]>) | null;
}

export type ServiceStop = () => void | Promise<void>;

// One lifecycle shape, start then ready: docs/architecture/plugins/node.md, "Services".
export interface ServiceSpec {
	name: string;
	// biome-ignore lint/suspicious/noConfusingVoidType: void keeps side-effect-only starts (no return statement) assignable
	start(ctx: ServiceContext): void | ServiceStop | Promise<void | ServiceStop>;
	// Runs after every service's `start` resolved. May return a stop function,
	// run on shutdown with the starts' (reverse order, `ready` stops first).
	// biome-ignore lint/suspicious/noConfusingVoidType: void keeps side-effect-only hooks (no return statement) assignable
	ready?(ctx: ServiceContext): void | ServiceStop | Promise<void | ServiceStop>;
}

export function defineService(spec: ServiceSpec): ServiceSpec {
	return spec;
}
