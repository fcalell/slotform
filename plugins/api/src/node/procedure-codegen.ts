import {
	dedupeImports,
	renderTsSourceFile,
	type TsExpression,
	type TsImportSpec,
} from "@fcalell/cli/ast";
import { runtimeChain } from "./codegen.ts";
import type { MiddlewareCall, PluginRuntimeEntry } from "./types.ts";

// Renders `.stack/procedure.ts`, the `virtual:stack-procedure` target: docs/architecture/runtime.md, "The rebuilt chain".
interface ProcedurePayload {
	// Same `workerBase` (`createWorker({...})` call) the real worker uses.
	base: TsExpression;
	// Same `pluginRuntimes` the real worker uses, in the same (sorted) order.
	runtimes: PluginRuntimeEntry[];
	// `workerImports` without the consumer files that import this one back: docs/architecture/runtime.md, "The rebuilt chain".
	imports: TsImportSpec[];
	// Same `middlewareCalls` the real worker's chain mounts, in the same order.
	middlewareChain: MiddlewareCall[];
	// The imports the middleware calls name, without the same files as `imports`.
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

// The entity vocabulary (sorted and unique, as the slot holds it) as an inline
// string-literal union, plain data like `renderStatementsType`; `string` when
// the app names none.
function renderEntityType(entities: readonly string[]): string {
	if (entities.length === 0) return "string";
	return entities.map((name) => JSON.stringify(name)).join(" | ");
}

export function aggregateProcedure(payload: ProcedurePayload): string {
	const { chain, imports: runtimeImports } = runtimeChain(
		payload.base,
		payload.runtimes,
		payload.middlewareChain,
		{},
	);

	const importsText = renderTsSourceFile({
		imports: dedupeImports([
			...payload.imports,
			...runtimeImports,
			...payload.middlewareImports,
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
