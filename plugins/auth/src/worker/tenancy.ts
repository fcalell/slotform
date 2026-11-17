import { and, eq, type SQL, sql } from "@fcalell/plugin-db/orm";
import {
	member,
	organization as organizationTable,
} from "../schema/organization.ts";
import type { MemberRow, Membership, Scope, ScopeContext } from "../scope.ts";

// The request context's tenancy capability: docs/architecture/plugins/auth.md, "Scopes".
export interface Tenancy {
	// Resolve a scope's chain for an id: docs/architecture/plugins/auth.md, "Scopes".
	resolve<S extends Scope>(
		scope: S,
		id: string,
		userId: string,
	): Promise<ScopeContext<S> | null>;
	// The same chain for the row a URL names: its slug, unique within the
	// parent whose id comes along (none for the organization).
	bySlug<S extends Scope>(
		scope: S,
		slug: string,
		parentId: string | undefined,
		userId: string,
	): Promise<ScopeContext<S> | null>;
	// Whether `role` grants every action named in `permissions`.
	can(role: string, permissions: Record<string, readonly string[]>): boolean;
}

// The surface of the drizzle client this module reads: one-row selects. The
// sqlite and D1 clients both answer `get()`, one synchronously, one with a
// promise, and `await` reads both. `db` is `unknown` across the plugin
// boundary and `get()` answers `unknown`, so each read casts to the row it
// selects.
interface SelectClient {
	select(fields: Record<string, unknown>): {
		from(table: unknown): {
			innerJoin(
				table: unknown,
				on: unknown,
			): { where(condition: unknown): { get(): unknown } };
			where(condition: unknown): { get(): unknown };
		};
	};
}

// `pin` restricts every match to one organization: docs/architecture/plugins/auth.md, "MCP OAuth".
export function createTenancy(
	db: unknown,
	roles: Record<string, unknown>,
	membership: Membership | null = null,
	pin?: string,
): Tenancy {
	const client = db as SelectClient;

	// The organization matching `where` and the caller's membership of it, in
	// one join; the consumer's membership predicate decides whether the
	// caller's `member` row counts.
	async function resolveOrganization(
		where: SQL,
		userId: string,
	): Promise<{ organization: unknown; member: MemberRow } | null> {
		const row = (await client
			.select({ organization: organizationTable, member })
			.from(member)
			.innerJoin(
				organizationTable,
				eq(member.organizationId, organizationTable.id),
			)
			.where(
				and(
					where,
					eq(member.userId, userId),
					membership ? sql`(${membership.where})` : undefined,
					pin === undefined ? undefined : eq(organizationTable.id, pin),
				),
			)
			.get()) as { organization: unknown; member: MemberRow } | undefined;
		return row ? { organization: row.organization, member: row.member } : null;
	}

	// Bottom-up, each level's row and its parent's id up to the organization;
	// then, once the root answers with the caller's member row, top-down, one
	// read per level that declares a visibility predicate. A non-member never
	// reaches a visibility read, and a level under an invisible one is refused
	// with it.
	async function resolve<S extends Scope>(
		scope: S,
		id: string,
		userId: string,
	): Promise<ScopeContext<S> | null> {
		const levels: { scope: Scope; id: string; row: unknown }[] = [];
		let level: Scope = scope;
		let levelId = id;
		while (level.parent !== null) {
			const [parent, parentColumn] = level.parent;
			const found = (await client
				.select({ row: level.table, parentId: parentColumn })
				.from(level.table)
				.where(eq(level.table.id, levelId))
				.get()) as { row: unknown; parentId: unknown } | undefined;
			if (!found || typeof found.parentId !== "string") return null;
			levels.push({ scope: level, id: levelId, row: found.row });
			level = parent;
			levelId = found.parentId;
		}
		const root = await resolveOrganization(
			eq(organizationTable.id, levelId),
			userId,
		);
		if (!root) return null;
		// The entries are keyed by the chain's scope names, which `ScopeContext<S>`
		// spells for the one `scope` the type parameter names.
		const entries: Record<string, unknown> = { ...root };
		for (const { scope: below, id: rowId, row } of levels.reverse()) {
			if (below.where) {
				const visible = await client
					.select({ id: below.table.id })
					.from(below.table)
					.where(
						and(eq(below.table.id, rowId), sql`(${below.where(root.member)})`),
					)
					.get();
				if (!visible) return null;
			}
			entries[below.name] = row;
		}
		return entries as ScopeContext<S>;
	}

	return {
		resolve,
		async bySlug<S extends Scope>(
			scope: S,
			slug: string,
			parentId: string | undefined,
			userId: string,
		): Promise<ScopeContext<S> | null> {
			if (scope.slug === null) return null;
			if (scope.parent === null) {
				// The organization root answers `organization` and `member`, the
				// whole `ScopeContext` of the organization scope.
				return resolveOrganization(
					eq(scope.slug, slug),
					userId,
				) as Promise<ScopeContext<S> | null>;
			}
			if (parentId === undefined) return null;
			const found = (await client
				.select({ id: scope.table.id })
				.from(scope.table)
				.where(and(eq(scope.slug, slug), eq(scope.parent[1], parentId)))
				.get()) as { id: string } | undefined;
			return found ? resolve(scope, found.id, userId) : null;
		},
		can(role, permissions) {
			const grants = resolveGrants(role, roles);
			return Object.entries(permissions).every(([resource, actions]) =>
				actions.every((action) => grants[resource]?.includes(action)),
			);
		},
	};
}

// The ids of the organizations `userId` is a member of, the membership
// predicate applied: what a tenancy resolves for them at the root. The
// authorization flow counts these to decide whether the member chooses.
// `db` is `unknown` across the plugin boundary, as in `createTenancy`.
export async function listOrganizations(
	db: unknown,
	membership: Membership | null,
	userId: string,
): Promise<string[]> {
	const rows = (await (
		db as {
			select(fields: Record<string, unknown>): {
				from(table: unknown): {
					where(condition: unknown): { all(): unknown };
				};
			};
		}
	)
		.select({ id: member.organizationId })
		.from(member)
		.where(
			and(
				eq(member.userId, userId),
				membership ? sql`(${membership.where})` : undefined,
			),
		)
		.all()) as { id: string }[];
	return rows.map((row) => row.id);
}

// A role's grants, either the bare `{resource: actions[]}` record
// `createAccessControl().newRole()` (`../access.ts`) and `defaultOrgRoles`
// return, or `.statements` on a real better-auth `Role` (a consumer who
// imported `better-auth/plugins/access` directly).
function grantsOf(role: unknown): Record<string, readonly string[]> | null {
	if (!role || typeof role !== "object") return null;
	if ("statements" in role) {
		const statements = role.statements;
		// A role's grants are lists of action names by contract; no check reads them.
		if (statements && typeof statements === "object") {
			return statements as Record<string, readonly string[]>;
		}
	}
	return role as Record<string, readonly string[]>;
}

// better-auth's member role is a comma-separated multi-role string: the
// grants are the union of every named role's. An unknown name adds nothing.
export function resolveGrants(
	roleField: string,
	roles: Record<string, unknown>,
): Record<string, readonly string[]> {
	const merged = new Map<string, Set<string>>();
	for (const name of roleField.split(",")) {
		const grants = grantsOf(roles[name]);
		if (!grants) continue;
		for (const [resource, actions] of Object.entries(grants)) {
			const set = merged.get(resource) ?? new Set<string>();
			for (const action of actions) set.add(action);
			merged.set(resource, set);
		}
	}
	return Object.fromEntries(
		[...merged].map(([resource, actions]) => [resource, [...actions]]),
	);
}
