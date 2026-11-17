import type { BaseContext } from "@fcalell/plugin-api/runtime";
import type {
	InferSelectModel,
	SQL,
	SQLiteColumn,
	SQLiteTable,
} from "@fcalell/plugin-db/orm";
import {
	type member,
	organization as organizationTable,
} from "./schema/organization.ts";

// A tenancy level is a descriptor: docs/architecture/plugins/api.md, "Scope".

type ScopeTable = SQLiteTable & { id: SQLiteColumn };

export interface Scope<
	TName extends string = string,
	TContext = unknown,
	TSlug extends SQLiteColumn | null = SQLiteColumn | null,
> {
	readonly name: TName;
	readonly table: ScopeTable;
	// The scope above and the column on this table holding its id; null at
	// the organization, the root.
	readonly parent: readonly [Scope, SQLiteColumn] | null;
	// The column a URL names the row by, unique within its parent. A scope
	// without one is addressed by id.
	readonly slug: TSlug;
	// Whether the row is visible to the member the root resolved: a fragment
	// over this scope's table, correlated to whatever it needs. Null when
	// every row of the member's organization is visible, as at the root.
	readonly where: ((member: MemberRow) => SQL) | null;
	// Phantom: what resolving the chain adds to a procedure's context.
	readonly __context?: TContext;
}

export type ScopeContext<S> = S extends Scope<string, infer C> ? C : never;

export type OrganizationRow = InferSelectModel<typeof organizationTable>;
export type MemberRow = InferSelectModel<typeof member>;

export const organization: Scope<
	"organization",
	{ organization: OrganizationRow; member: MemberRow },
	SQLiteColumn
> = {
	name: "organization",
	table: organizationTable,
	parent: null,
	slug: organizationTable.slug,
	where: null,
};

// Which `member` rows count as a membership: docs/architecture/plugins/auth.md, "Scopes".
export interface Membership {
	readonly kind: "membership";
	readonly where: SQL;
}

export function defineMembership(where: SQL): Membership {
	return { kind: "membership", where };
}

// Scope names refused: keys of plugin-api's base context, checked against its type: docs/architecture/plugins/auth.md, "Scopes".
type BaseContextKey = keyof {
	[K in keyof BaseContext as string extends K ? never : K]: unknown;
};
const BASE_CONTEXT: Record<BaseContextKey, true> = {
	env: true,
	httpRequest: true,
	reqHeaders: true,
	resHeaders: true,
	executionCtx: true,
};
// ...and the keys the runtimes and middlewares add before a scope resolves: docs/architecture/plugins/auth.md, "Scopes".
const RESERVED = new Set([
	...Object.keys(BASE_CONTEXT),
	"_devMode",
	"db",
	"auth",
	"tenancy",
	"_rateLimiter",
	"_trustedOrigins",
	"user",
	"session",
	"organization",
	"member",
	// The MCP endpoint's verified caller, and the OAuth capability with `mcp`.
	"_caller",
	"oauth",
]);

export function defineScope<
	const TName extends string,
	TTable extends ScopeTable,
	TParent extends Scope,
	const TSlug extends SQLiteColumn | undefined = undefined,
>(def: {
	name: TName;
	table: TTable;
	parent: readonly [TParent, SQLiteColumn];
	slug?: TSlug;
	where?: (member: MemberRow) => SQL;
}): Scope<
	TName,
	ScopeContext<TParent> & { [K in TName]: InferSelectModel<TTable> },
	TSlug extends SQLiteColumn ? TSlug : null
> {
	if (RESERVED.has(def.name)) {
		throw new Error(
			`defineScope: "${def.name}" is a key of the procedure context; pick another scope name.`,
		);
	}
	for (const [role, column] of [
		["parent", def.parent[1]],
		["slug", def.slug],
	] as const) {
		if (column && column.table !== def.table) {
			throw new Error(
				`defineScope("${def.name}"): the ${role} column belongs to another table.`,
			);
		}
	}
	return {
		name: def.name,
		table: def.table,
		parent: def.parent,
		// `TSlug` is the column when `def.slug` is given and `undefined`
		// otherwise, so this is the conditional return type's own value; tsc
		// cannot reduce that conditional while `TSlug` is open.
		slug: (def.slug ?? null) as TSlug extends SQLiteColumn ? TSlug : null,
		where: def.where ?? null,
	};
}
