import {
	dedupeImports,
	renderTsSourceFile,
	type TsExpression,
	type TsImportSpec,
} from "@fcalell/cli/ast";
import {
	type MiddlewareCall,
	type PluginRuntimeEntry,
	ROUTES_BARREL_IMPORT_SOURCE,
} from "./types.ts";

// Renders `.stack/procedure.ts`, the `virtual:stack-procedure` target: docs/architecture/runtime.md, "The rebuilt chain".
interface ProcedurePayload {
	// Same `workerBase` (`createWorker({...})` call) the real worker uses.
	base: TsExpression;
	// Same `pluginRuntimes` the real worker uses, in the same (sorted) order.
	runtimes: PluginRuntimeEntry[];
	// The full `workerImports` list minus the route barrel: docs/architecture/runtime.md, "The rebuilt chain".
	imports: TsImportSpec[];
	// Same `middlewareCalls` the real worker's `.use(...)` chain mounts, in
	// the same (phase + order sorted) sequence. See the cycle note above.
	middlewareChain: MiddlewareCall[];
	// Imports the middleware call expressions need (e.g. the consumer's
	// default-exported `middleware` identifier). Never the route barrel — a
	// middleware file importing the barrel back would itself be a cycle, but
	// that's a consumer authoring error, not something this codegen guards.
	middlewareImports: TsImportSpec[];
	// RBAC statements from `api.slots.rbacStatements`: docs/architecture/slot-catalog.md, "`api.slots.*` (plugin-api)".
	statements: Record<string, readonly string[]> | null;
	// The entity vocabulary from `api.slots.entities`: docs/architecture/plugins/api.md, "Entities".
	entities: readonly string[];
}

const APP_BUILDER_IMPORT: TsImportSpec = {
	source: "@fcalell/plugin-api/runtime",
	named: ["AppBuilder"],
	typeOnly: true,
};

const CREATE_PROCEDURE_IMPORT: TsImportSpec = {
	source: "@fcalell/plugin-api/procedure",
	named: ["createJobs", "createProcedure"],
};

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

// The statements record as an inline type literal: docs/architecture/slot-catalog.md, "`api.slots.*` (plugin-api)".
function renderStatementsType(
	statements: Record<string, readonly string[]> | null,
): string {
	if (statements === null) return "Record<never, never>";
	const entries = Object.entries(statements).map(([key, actions]) => {
		const keyText = IDENT_RE.test(key) ? key : JSON.stringify(key);
		const tuple = actions.map((a) => JSON.stringify(a)).join(", ");
		return `\t${keyText}: readonly [${tuple}];`;
	});
	if (entries.length === 0) return "Record<never, never>";
	return `{\n${entries.join("\n")}\n}`;
}

// Renders the entity vocabulary as an inline string-literal union — same
// "plain data, no cross-module type import" approach as
// `renderStatementsType`. Empty falls back to the domain-agnostic `string`
// (api stays domain-agnostic; the slot itself already dedupes/sorts contributed
// names — see `api.slots.entities` — this dedup is defense in depth for a raw
// `AggregateProcedureInput` caller).
function renderEntityType(entities: readonly string[]): string {
	if (entities.length === 0) return "string";
	const seen = new Set<string>();
	const literals: string[] = [];
	for (const name of entities) {
		if (seen.has(name)) continue;
		seen.add(name);
		literals.push(JSON.stringify(name));
	}
	if (literals.length === 0) return "string";
	return literals.join(" | ");
}

// The chain `typeof __chain` infers `TContext` from: docs/architecture/runtime.md, "The rebuilt chain".
function buildChain(
	base: TsExpression,
	runtimes: PluginRuntimeEntry[],
	middlewareChain: MiddlewareCall[],
): { chain: TsExpression; imports: TsImportSpec[] } {
	let chain = base;
	const imports: TsImportSpec[] = [];
	for (const rt of runtimes) {
		imports.push(rt.import);
		const properties = Object.entries(rt.options).map(([key, value]) => ({
			key,
			value,
		}));
		const runtimeCall: TsExpression = {
			kind: "call",
			callee: { kind: "identifier", name: rt.identifier },
			args: [{ kind: "object", properties }],
		};
		chain = {
			kind: "call",
			callee: { kind: "member", object: chain, property: "use" },
			args: [runtimeCall],
		};
	}
	for (const mw of middlewareChain) {
		chain = {
			kind: "call",
			callee: { kind: "member", object: chain, property: mw.method },
			args: [mw.call],
		};
	}
	return { chain, imports };
}

export function aggregateProcedure(payload: ProcedurePayload): string | null {
	const { chain, imports: runtimeImports } = buildChain(
		payload.base,
		payload.runtimes,
		payload.middlewareChain,
	);

	const auxiliaryImports = payload.imports.filter(
		(imp) => imp.source !== ROUTES_BARREL_IMPORT_SOURCE,
	);
	const middlewareImports = payload.middlewareImports.filter(
		(imp) => imp.source !== ROUTES_BARREL_IMPORT_SOURCE,
	);

	const importsText = renderTsSourceFile({
		imports: dedupeImports([
			...auxiliaryImports,
			...runtimeImports,
			...middlewareImports,
			APP_BUILDER_IMPORT,
			CREATE_PROCEDURE_IMPORT,
		]),
		statements: [{ kind: "const", name: "__chain", value: chain }],
	});

	const statementsType = renderStatementsType(payload.statements);
	const entityType = renderEntityType(payload.entities);

	return `${importsText}
// Type-only: \`__chain\` mirrors the runtime plugin composition in
// .stack/worker.ts so \`WorkerContext\` matches the real request context
// without re-deriving each runtime factory's generics by hand. Never
// exported or called further — only its type is used below.
type ContextOf<B> = B extends AppBuilder<infer C> ? C : never;
// Exported so post-context middleware can type \`stackContext<WorkerContext>(c)\`.
// Import it type-only: this module imports the middleware file back, and only
// erasure keeps that from being a real cycle.
export type WorkerContext = ContextOf<typeof __chain>;
type RbacStatements = ${statementsType};
export type Entity = ${entityType};

// Types the client's \`invalidateForWrites\` and a query's \`meta.reads\` over
// \`Entity\` (type-only: nothing reaches the bundle). \`worker.ts\` re-exports
// \`Entity\`, so an app's program loads this file with the router type. The
// import puts the module in the program, which an augmentation alone does not.
import type {} from "@fcalell/plugin-api/query-invalidation";
declare module "@fcalell/plugin-api/query-invalidation" {
	interface Register {
		entity: Entity;
	}
}

// What a queue or cron handler receives: a request's context without the
// request (no \`httpRequest\`, headers or user). A mapped type, not \`Omit\`: the
// base context's index signature would make \`Omit\` drop every named key.
export type JobContext = {
	[K in keyof WorkerContext as string extends K
		? never
		: K extends "httpRequest" | "reqHeaders" | "resHeaders"
			? never
			: K]: WorkerContext[K];
};
export const { defineQueue, defineScheduled } = createJobs<JobContext>();

export const procedure = createProcedure<WorkerContext, RbacStatements, Entity>();
`;
}
