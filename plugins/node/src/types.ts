import type { TsExpression, TsImportSpec } from "@slotform/cli/ast";
import { z } from "zod";

// A further port the server answers on for one origin of its own (the app at a
// proxy's named address beside its loopback port, say). Its origin is read from
// `originVar` in the server's env on every request, so it can change while the
// server runs; while it is unset or not an http(s) origin, the listener refuses
// everything.
const nodeListenerSchema = z.object({
	port: z.number().int().min(1).max(65535),
	host: z.string().min(1).optional(),
	originVar: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
});

export type NodeListenerOptions = z.output<typeof nodeListenerSchema>;

export const nodeOptionsSchema = z
	.object({
		port: z.number().int().min(1).max(65535).default(8788),
		// The address the server binds. Unset binds every interface; a server
		// behind a proxy, or one that must stay off the network, names loopback.
		host: z.string().min(1).optional(),
		// Further listeners by name: docs/architecture/plugins/node.md, "Hosts and listeners".
		listeners: z
			.record(z.string().regex(/^[a-z][a-z0-9-]*$/), nodeListenerSchema)
			.default({}),
		// Bytes: a request body over `body` is refused with 413, and a
		// WebSocket frame over `frame` closes its socket.
		bounds: z
			.object({
				body: z
					.number()
					.int()
					.positive()
					.default(16 * 1024 * 1024),
				frame: z
					.number()
					.int()
					.positive()
					.default(1024 * 1024),
			})
			.default({ body: 16 * 1024 * 1024, frame: 1024 * 1024 }),
	})
	.superRefine((options, ctx) => {
		const ports = new Set([options.port]);
		for (const [name, listener] of Object.entries(options.listeners)) {
			if (ports.has(listener.port)) {
				ctx.addIssue({
					code: "custom",
					path: ["listeners", name, "port"],
					message: `listener "${name}" takes port ${listener.port}, which another listener holds`,
				});
			}
			ports.add(listener.port);
		}
	});

export type NodeOptions = z.input<typeof nodeOptionsSchema>;
export type NodeOptionsResolved = z.output<typeof nodeOptionsSchema>;

// A statically imported ServiceSpec expression: docs/architecture/plugins/node.md, "Generated server entry".
export interface ServiceEntry {
	name: string;
	imports: TsImportSpec[];
	expression: TsExpression;
}

// What a plugin adds to the production bundle: docs/architecture/plugins/node.md, "Build and bundle".
export interface BundleEntry {
	name: string;
	imports?: TsImportSpec[];
	boot?: TsExpression;
	copy?: Array<{
		// A file or directory relative to the project root; one that does not
		// exist copies nothing (db before its first migration).
		from: string;
		// Its place relative to the bundle's directory.
		to: string;
		// Which files under `from` are copied (a path relative to `from`); all by default.
		only?: (path: string) => boolean;
	}>;
}

export interface CodegenServerPayload {
	port: number;
	host: string | null;
	// The origins the main listener is reached at (api's CORS list): the Host
	// rule's allow-list.
	origins: string[];
	listeners: Record<string, NodeListenerOptions>;
	bounds: { body: number; frame: number };
	hasWorker: boolean;
	workerPaths: string[];
	// The web client's build directory, relative to the project root; null
	// when there is no web client.
	staticRoot: string | null;
	// Headers the static files and the shell carry; rendered only with a
	// static root.
	clientHeaders: Record<string, string>;
	hasConsumerServices: boolean;
	services: ServiceEntry[];
	// The generated worker module the source entry loads: `./worker.ts` unless a
	// `slotform screens serve` run loads its own wrapper.
	workerFile?: string;
	// Set for the production bundle's entry: docs/architecture/plugins/node.md, "Build and bundle".
	bundle?: {
		imports: TsImportSpec[];
		boot: TsExpression[];
	};
}
