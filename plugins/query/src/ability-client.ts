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

// Packed rules are opaque JSON here: docs/architecture/plugins/auth.md, "Ability wire format".
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

// The caller's rules in one organization: docs/architecture/plugins/query.md, "Abilities".
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
		// NOT_FOUND answers `[]`, every other error propagates: docs/architecture/plugins/query.md, "Abilities".
		if (isNotFound(error)) return [];
		throw error;
	}
}

// Deny-all default, memoized per array identity: docs/architecture/plugins/query.md, "Abilities".
const DENY_ALL: MongoAbility = createMongoAbility([]);
const EMPTY_RULES: PackedRulesLike = [];
const compositionCache = new WeakMap<
	PackedRulesLike,
	WeakMap<PackedRulesLike, MongoAbility>
>();

// Org and record rules concatenate: docs/architecture/plugins/query.md, "Abilities".
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

// The key matches the entity registry's path: docs/architecture/plugins/query.md, "Abilities".
export const ORG_RULES_QUERY_KEY = [ORG_RULES_PATH] as const;

export function orgRulesQueryKey(organizationId: string) {
	return [ORG_RULES_PATH, { input: { organizationId } }] as const;
}

// The org rules read is ambient: docs/architecture/plugins/query.md, "Abilities".
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

// Only the packed-rules array is cached, the composed ability never: docs/architecture/plugins/query.md, "Abilities".
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
