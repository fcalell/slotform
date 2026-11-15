import {
	type AbilityTuple,
	createMongoAbility,
	type MongoAbility,
	type MongoQuery,
	type RawRuleOf,
} from "@casl/ability";
import { type PackRule, unpackRules } from "@casl/ability/extra";
import { getRegisteredApiClient, isNotFound } from "@fcalell/plugin-api/client";
import { ORG_RULES_PATH } from "@fcalell/plugin-api/wire";
import {
	combine,
	isPlaceholder,
	placeholderData,
	type Read,
	type Selection,
} from "@fcalell/ui-core/read";
import { read } from "./read.ts";

// The core behind `useAbility()` and `ability` on every platform
// (`./tanstack-query.tsx`): the caller's org rules as a read, and the ability
// composed from them.

// The wire shape is CASL's `packRules` array. It's opaque JSON at this
// layer -- the dependency direction is auth -> api, so the client side
// can't import plugin-auth's `PackedRules<A>` type, only unpack the data
// generically.
export type PackedRulesLike = readonly unknown[];

function unpack(rules: PackedRulesLike): RawRuleOf<MongoAbility>[] {
	return unpackRules(rules as unknown as PackRule<RawRuleOf<MongoAbility>>[]);
}

// A framework-owned route (one a runtime plugin registers, outside the
// consumer's typed router) on the registered client. An `@orpc/client`
// client is a `Proxy` whose `get` builds a callable child per path segment,
// so walking the path yields the callable route.
function registeredRoute(
	path: readonly string[],
	caller: string,
): (input: unknown) => Promise<unknown> {
	const client = getRegisteredApiClient();
	if (client === undefined) {
		throw new Error(
			`${caller}: no api client registered -- call \`createClient(...)\` ` +
				`(@fcalell/plugin-api/client) before ${caller} runs.`,
		);
	}
	return path.reduce<unknown>(
		(node, segment) => (node as Record<string, unknown>)[segment],
		client,
	) as (input: unknown) => Promise<unknown>;
}

// The caller's rules in one organization: their role there, never the
// session's active organization. `useAbility`'s query runs with
// `staleTime: Infinity`, so a missing client throws rather than caching a
// false deny-all forever; the query's error state (retries, deny-all
// meanwhile) surfaces it.
export async function fetchOrgRules(
	organizationId: string,
): Promise<PackedRulesLike> {
	const route = registeredRoute(ORG_RULES_PATH, "useAbility()");
	try {
		const response = (await route({ organizationId })) as {
			rules: PackedRulesLike;
		};
		return response.rules;
	} catch (error) {
		// NOT_FOUND means no org layer (the route exists only with organizations
		// on) or no membership of this organization: both deny everything, and
		// neither is a real failure. Every other error propagates: a real outage must
		// surface through the query's error state, never a silent deny-all.
		if (isNotFound(error)) return [];
		throw error;
	}
}

// Deny-all default, memoized per (orgRules, recordRules) array
// identity. `useAbility` composes on every call; recreating a `MongoAbility`
// each time would defeat structural sharing -- a fresh class instance never
// `===` the last one -- so callers must never select the ability itself out
// of a query cache. Compose it here instead, where identical array
// references always produce the identical ability instance.
const DENY_ALL: MongoAbility = createMongoAbility([]);
const EMPTY_RULES: PackedRulesLike = [];
const compositionCache = new WeakMap<
	PackedRulesLike,
	WeakMap<PackedRulesLike, MongoAbility>
>();

// Deny-all when both layers are absent/undefined (rules not loaded yet, no
// record layer supplied). Otherwise concatenates org ∪ record rules into one
// ability: CASL rule concatenation is safe across the two because subject
// namespaces can't collide (org subjects are framework-owned lowercase
// resource names like "organization"/"member"/"invitation"; record subjects
// are consumer domain types).
export function composeAbility(
	orgRules: PackedRulesLike | undefined,
	recordRules?: PackedRulesLike | undefined,
): MongoAbility {
	if (!orgRules && !recordRules) return DENY_ALL;

	const org = orgRules ?? EMPTY_RULES;
	const record = recordRules ?? EMPTY_RULES;

	let byRecord = compositionCache.get(org);
	if (!byRecord) {
		byRecord = new WeakMap();
		compositionCache.set(org, byRecord);
	}

	let ability = byRecord.get(record);
	if (!ability) {
		// Explicit type args: `createMongoAbility`'s generic overload otherwise
		// infers the weaker `AnyMongoAbility` from a plain `RawRuleOf<MongoAbility>`
		// array, which doesn't structurally satisfy `MongoAbility` itself.
		ability = createMongoAbility<AbilityTuple, MongoQuery>([
			...unpack(org),
			...unpack(record),
		]);
		byRecord.set(record, ability);
	}
	return ability;
}

// Shaped like `@orpc/tanstack-query`'s operation keys (`[path, { input }]`)
// so the entity-based invalidation registry
// (`@fcalell/plugin-api/query-invalidation`), which
// matches on the path, recognizes it for free: a mutation that declares
// `writes` on an org subject (e.g. "member") invalidates every
// organization's rules, as any other oRPC-backed query. The bare path is the
// prefix for explicit invalidation of all of them:
// `queryClient.invalidateQueries({ queryKey: ORG_RULES_QUERY_KEY })`.
export const ORG_RULES_QUERY_KEY = [ORG_RULES_PATH] as const;

export function orgRulesQueryKey(organizationId: string) {
	return [ORG_RULES_PATH, { input: { organizationId } }] as const;
}

// The caller's rules in one organization, cached per organization
// (`staleTime: Infinity`); a role change invalidates them when its mutation
// declares `writes` on an org subject (see `./ability-client.ts`'s
// `ORG_RULES_QUERY_KEY` comment). The read is ambient: no frame holds it, so a
// failure leaves what it gates painted and inert, never a false yes. No
// organization yet: it answers `[]` at once (deny-all, no request), so what it
// gates never stays painted.
export function orgRules(
	organizationId: string | undefined,
): Read<PackedRulesLike> {
	return read<PackedRulesLike>({
		queryKey: orgRulesQueryKey(organizationId ?? ""),
		queryFn: () => fetchOrgRules(organizationId ?? ""),
		enabled: organizationId !== undefined,
		staleTime: Infinity,
		meta: { ambient: true },
		...(organizationId === undefined && { initialData: [] }),
	});
}

// The composed `MongoAbility` is a class instance and must never be read out
// of the query cache (only the plain packed-rules array is cached);
// composition happens here, memoized by array identity in `composeAbility`.
// Over the placeholder it stays the placeholder, so an act gated on it
// (`ability.at(a => a.can(...) ? act : { ...act, blocked })`) paints inert
// while the rules load, never blocked.
const composed = (
	rules: PackedRulesLike,
	record?: PackedRulesLike,
): MongoAbility =>
	isPlaceholder(rules)
		? (placeholderData() as MongoAbility)
		: composeAbility(rules, record);

export function ability(
	organizationId: string | undefined,
	record?: Selection<PackedRulesLike | undefined>,
): Selection<MongoAbility> {
	const rules = orgRules(organizationId);
	return record
		? combine([rules, record], (r, rec) => composed(r, rec))
		: rules.at((r) => composed(r));
}
