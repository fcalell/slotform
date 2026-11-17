import { STACK_READS_HEADER, STACK_WRITES_HEADER } from "./wire.ts";

// The client half of entity-based cache invalidation: docs/architecture/plugins/api.md, "Cache invalidation".

// The app's entity names: docs/architecture/plugins/api.md, "Cache invalidation".
// biome-ignore lint/suspicious/noEmptyInterface: an interface so `.stack/procedure.ts` can merge into it
export interface Register {}

export type EntityName = Register extends {
	entity: infer TEntity extends string;
}
	? TEntity
	: string;

interface EntityEntry {
	reads: string[];
	writes: string[];
}

// Structural subset of `@tanstack/react-query`'s `QueryClient`, so plugin-api
// depends on no query library.
export interface InvalidatableQueryClient {
	invalidateQueries(filters: {
		predicate: (query: {
			queryKey: readonly unknown[];
			meta?: Record<string, unknown> | undefined;
		}) => boolean;
	}): unknown;
}

// Declared reads of a query outside the API: docs/architecture/plugins/api.md, "Cache invalidation".
function declaredReads(
	meta: Record<string, unknown> | undefined,
): readonly string[] | undefined {
	const reads = meta?.reads;
	return Array.isArray(reads) &&
		reads.every((entity) => typeof entity === "string")
		? reads
		: undefined;
}

export interface EntityRegistry {
	/** Parses `x-stack-reads` / `x-stack-writes` off `headers` for `pathKey`. An absent header leaves that side untouched. */
	capture(pathKey: string, headers: Headers): void;
	/** Invalidates every cached query whose recorded or declared (`meta.reads`) reads intersect `writes`. */
	invalidateForWrites(
		queryClient: InvalidatableQueryClient,
		writes: readonly EntityName[],
	): void;
	/** Looks up the writes recorded for `mutationKey`'s pathKey and invalidates for them. No-op when nothing was recorded. */
	handleMutationSuccess(
		queryClient: InvalidatableQueryClient,
		mutationKey: readonly unknown[] | undefined,
	): void;
}

function splitHeaderValue(value: string): string[] {
	return value
		.split(",")
		.map((entity) => entity.trim())
		.filter((entity) => entity.length > 0);
}

// The "todos/list" pathKey sits at index 0 of the `[path, options]` tuple
// `@orpc/tanstack-query` produces for both query and mutation keys.
function pathKeyFromOperationKey(
	key: readonly unknown[] | undefined,
): string | undefined {
	if (!key) return undefined;
	const path = key[0];
	if (!Array.isArray(path) || !path.every((seg) => typeof seg === "string")) {
		return undefined;
	}
	return (path as string[]).join("/");
}

export function createEntityRegistry(): EntityRegistry {
	const entries = new Map<string, EntityEntry>();

	function capture(pathKey: string, headers: Headers): void {
		const reads = headers.get(STACK_READS_HEADER);
		const writes = headers.get(STACK_WRITES_HEADER);
		if (reads === null && writes === null) return;

		const entry = entries.get(pathKey) ?? { reads: [], writes: [] };
		if (reads !== null) entry.reads = splitHeaderValue(reads);
		if (writes !== null) entry.writes = splitHeaderValue(writes);
		entries.set(pathKey, entry);
	}

	function invalidateForWrites(
		queryClient: InvalidatableQueryClient,
		writes: readonly string[],
	): void {
		if (writes.length === 0) return;
		const writeSet = new Set(writes);

		queryClient.invalidateQueries({
			predicate: (query) => {
				const pathKey = pathKeyFromOperationKey(query.queryKey);
				const reads =
					declaredReads(query.meta) ??
					(pathKey ? entries.get(pathKey)?.reads : undefined);
				return reads?.some((entity) => writeSet.has(entity)) ?? false;
			},
		});
	}

	function handleMutationSuccess(
		queryClient: InvalidatableQueryClient,
		mutationKey: readonly unknown[] | undefined,
	): void {
		const pathKey = pathKeyFromOperationKey(mutationKey);
		if (!pathKey) return;
		const writes = entries.get(pathKey)?.writes;
		if (!writes || writes.length === 0) return;
		invalidateForWrites(queryClient, writes);
	}

	return { capture, invalidateForWrites, handleMutationSuccess };
}

// The default registry: docs/architecture/plugins/api.md, "Client". It assumes one client and one user per isolate.
const defaultEntityRegistry: EntityRegistry = createEntityRegistry();

export function captureEntityHeaders(pathKey: string, headers: Headers): void {
	defaultEntityRegistry.capture(pathKey, headers);
}

export function invalidateForWrites(
	queryClient: InvalidatableQueryClient,
	writes: readonly EntityName[],
): void {
	defaultEntityRegistry.invalidateForWrites(queryClient, writes);
}

export function handleMutationSuccess(
	queryClient: InvalidatableQueryClient,
	mutationKey: readonly unknown[] | undefined,
): void {
	defaultEntityRegistry.handleMutationSuccess(queryClient, mutationKey);
}
