import type { TsExpression, TsImportSpec } from "@fcalell/cli/ast";

// The generated files: docs/architecture/plugins/api.md, "Generated files".
export const WORKER_FILE = ".stack/worker.ts";
export const PROCEDURE_FILE = ".stack/procedure.ts";

// The route barrel: docs/architecture/plugins/api.md, "Routes barrel".
export const ROUTES_DIR = "src/worker/routes";
export const ROUTES_BARREL = `${ROUTES_DIR}/index.ts`;

// How a file generated into `.stack/` imports a consumer source file.
export function importSource(file: string): string {
	return `../${file}`;
}

export const ROUTES_BARREL_IMPORT_SOURCE = importSource(ROUTES_BARREL);

// A plugin's runtime contribution to the worker chain. Captured structurally
// so the worker derivation can attach callbacks and render options uniformly.
//
// `options` is keyed (insertion-ordered) so contributors can construct them
// without caring about rendering order; the aggregator emits one `{ key: value }`
// entry per pair.
export interface PluginRuntimeEntry {
	plugin: string;
	// Runtime package import. Must be a `default` import (the factory is the
	// default export of `@fcalell/plugin-<name>/runtime` by convention).
	import: TsImportSpec;
	// Identifier used as the call callee. Derived from `import.default`; kept
	// explicit so the aggregator doesn't re-narrow the import union.
	identifier: string;
	options: Record<string, TsExpression>;
}

// Callback attachment: docs/architecture/plugins/api.md, "Callbacks".
export interface CallbackSpec {
	import: TsImportSpec;
	identifier: string;
}

// The input type of the `aggregateWorker` pure function.
export interface WorkerPayload {
	imports: TsImportSpec[];
	base: TsExpression;
	pluginRuntimes: PluginRuntimeEntry[];
	middlewareChain: MiddlewareCall[];
	handler: { identifier: string } | null;
	// `src/worker/mcp.ts`'s default export and the server name, passed to
	// `.handler(routes, { mcp, name })`; null without the file.
	mcp: { identifier: string; name: string } | null;
	// `src/worker/queue.ts` and `src/worker/scheduled.ts`'s default exports,
	// passed as `queue` and `scheduled` beside `mcp`; null without the file.
	queue: { identifier: string } | null;
	scheduled: { identifier: string } | null;
	// Keyed by plugin name, matching `PluginRuntimeEntry.plugin`.
	callbacks: Record<string, CallbackSpec>;
}

// A middleware call and the builder method that mounts it: docs/architecture/runtime.md, "Middleware".
export interface MiddlewareCall {
	call: TsExpression;
	method: "use" | "useAfterContext";
}
