import {
	dedupeImports,
	type MiddlewareSpec,
	renderTsSourceFile,
	type TsExpression,
	type TsImportSpec,
	type TsSourceFile,
} from "@fcalell/cli/ast";
import type {
	CallbackSpec,
	MiddlewareCall,
	PluginRuntimeEntry,
	WorkerPayload,
} from "./types.ts";

// `<base>.use(<rt1>(opts))...use(<mw1>)...`, the chain `.stack/worker.ts` and
// `.stack/procedure.ts` both build, with each runtime's callback spliced into
// its options: docs/architecture/runtime.md, "Chain order".
export function runtimeChain(
	base: TsExpression,
	runtimes: readonly PluginRuntimeEntry[],
	middlewareChain: readonly MiddlewareCall[],
	callbacks: Readonly<Record<string, CallbackSpec>>,
): { chain: TsExpression; imports: TsImportSpec[] } {
	let chain = base;
	const runtimeImports: TsImportSpec[] = [];
	const callbackImports: TsImportSpec[] = [];
	for (const rt of runtimes) {
		runtimeImports.push(rt.import);
		const properties = Object.entries(rt.options).map(([key, value]) => ({
			key,
			value,
		}));
		const callback = callbacks[rt.plugin];
		if (callback) {
			properties.push({
				key: "callbacks",
				value: { kind: "identifier", name: callback.identifier },
			});
			callbackImports.push(callback.import);
		}
		chain = {
			kind: "call",
			callee: { kind: "member", object: chain, property: "use" },
			args: [
				{
					kind: "call",
					callee: { kind: "identifier", name: rt.identifier },
					args: [{ kind: "object", properties }],
				},
			],
		};
	}
	for (const mw of middlewareChain) {
		chain = {
			kind: "call",
			callee: { kind: "member", object: chain, property: mw.method },
			args: [mw.call],
		};
	}
	return { chain, imports: [...runtimeImports, ...callbackImports] };
}

// The `.stack/worker.ts` source, the `workerSource` slot's: docs/architecture/plugins/api.md, "Generated files".
export function aggregateWorker(payload: WorkerPayload): string {
	const { chain, imports } = runtimeChain(
		payload.base,
		payload.pluginRuntimes,
		payload.middlewareChain,
		payload.callbacks,
	);

	// The mount object: `mcp` (with the server's name), `queue`, `scheduled`,
	// each key only when its file is there.
	const mount: Array<{ key: string; value: TsExpression }> = [];
	if (payload.mcp) {
		mount.push(
			{
				key: "mcp",
				value: { kind: "identifier", name: payload.mcp.identifier },
			},
			{ key: "name", value: { kind: "string", value: payload.mcp.name } },
		);
	}
	if (payload.queue) {
		mount.push({
			key: "queue",
			value: { kind: "identifier", name: payload.queue.identifier },
		});
	}
	if (payload.scheduled) {
		mount.push({
			key: "scheduled",
			value: { kind: "identifier", name: payload.scheduled.identifier },
		});
	}
	const args: TsExpression[] = [];
	if (payload.handler || mount.length > 0) {
		// A worker with plugins but no routes still takes a mount: the routes
		// argument is then an empty object.
		args.push(
			payload.handler
				? { kind: "identifier", name: payload.handler.identifier }
				: { kind: "object", properties: [] },
		);
	}
	if (mount.length > 0) args.push({ kind: "object", properties: mount });

	const spec: TsSourceFile = {
		imports: dedupeImports([...payload.imports, ...imports]),
		statements: [
			{
				kind: "const",
				name: "worker",
				value: {
					kind: "call",
					callee: { kind: "member", object: chain, property: "handler" },
					args,
				},
			},
			{
				kind: "export-type",
				name: "AppRouter",
				// `typeof <expr>` isn't a first-class TsTypeRef kind; rendering as a
				// bare `reference` pastes the text verbatim which is what we want.
				type: { kind: "reference", name: "typeof worker._router" },
			},
			// Loads `procedure.ts`, and so its `Register` merge (see
			// `./procedure-codegen.ts`), into any program that reads the router type.
			{ kind: "export-type-ref", source: "./procedure.ts", names: ["Entity"] },
			{
				kind: "export-default",
				value: { kind: "identifier", name: "worker" },
			},
		],
	};
	return renderTsSourceFile(spec);
}

const MIDDLEWARE_PHASE_ORDER: Record<MiddlewareSpec["phase"], number> = {
	"before-cors": 0,
	"after-cors": 1,
	"before-routes": 2,
	"after-routes": 3,
	"after-context": 4,
};

// Mount order: phase, then `order`, then contribution order (the sort is
// stable): docs/architecture/runtime.md, "Middleware".
function mountOrder(entries: readonly MiddlewareSpec[]): MiddlewareSpec[] {
	return [...entries].sort(
		(a, b) =>
			MIDDLEWARE_PHASE_ORDER[a.phase] - MIDDLEWARE_PHASE_ORDER[b.phase] ||
			a.order - b.order,
	);
}

// The `middlewareCalls` slot: each call with the builder method that mounts it.
export function middlewareCallsOf(
	entries: readonly MiddlewareSpec[],
): MiddlewareCall[] {
	return mountOrder(entries).map((entry) => ({
		call: entry.call,
		method: entry.phase === "after-context" ? "useAfterContext" : "use",
	}));
}

// The `middlewareImports` slot: the imports the calls name.
export function middlewareImportsOf(
	entries: readonly MiddlewareSpec[],
): TsImportSpec[] {
	return dedupeImports(mountOrder(entries).flatMap((entry) => entry.imports));
}
