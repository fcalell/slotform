// The scope the route supplies to the client. The URL names the scope by slug;
// the boundary that resolves it registers the ids here (`ScopeBoundary` in
// `./react/scope.ts`), and the binding's query utils merge them into the input
// of every call before the query key is built, so the id stays in the key and
// two scopes never share a cache entry. No React import: a client bundle holds
// one copy of this module, reached by package name.

/** The ids a boundary registers: `{ organizationId }`, and under a project `{ organizationId, projectId }`. */
export type ScopeIds = Readonly<Record<string, string>>;

// Ambient: the scope of the innermost boundary rendered, with its depth (the
// boundaries above it). One client, one active route subtree per isolate (the
// same assumption as plugin-api's registered client); an SSR target that
// serves many users from one isolate passes ids explicitly (`scoped`).
let registered: { ids: ScopeIds; depth: number } = { ids: {}, depth: 0 };

/** Registers a boundary's ids at its depth. A boundary shallower than the one registered never replaces it: React runs mount effects child first, so without the depth an outer boundary's effect would put its own ids back over the inner's. */
export function registerScope(ids: ScopeIds, depth = 0): void {
	if (depth >= registered.depth) registered = { ids, depth };
}

/** Puts the outer boundary's ids back when a boundary leaves, if its own ids are the ones registered; a boundary that replaced them already (the next route's) keeps its registration. */
export function releaseScope(
	ids: ScopeIds,
	outer: ScopeIds,
	outerDepth: number,
): void {
	if (registered.ids === ids) registered = { ids: outer, depth: outerDepth };
}

export function registeredScope(): ScopeIds {
	return registered.ids;
}

// An input the ids may be merged into: nothing, or a plain object. A
// `skipToken`, a string, an array, a class instance pass through as they are.
function isMergeable(input: unknown): input is object | undefined {
	if (input === undefined) return true;
	if (typeof input !== "object" || input === null) return false;
	const proto = Object.getPrototypeOf(input);
	return proto === Object.prototype || proto === null;
}

/** The part of `.stack/schema.ts` the client reads here: each procedure by dotted path with the input key its scope adds (null when it has none). */
export type ScopeSchema = Readonly<
	Record<string, { readonly scope: string | null } | undefined>
>;

/**
 * The input with the scope `key` of `procedure` set from `ids`: only that key, and
 * an id the input names wins (an input key set to `undefined` does not). Throws,
 * before any request, when neither names it, unless `lenient` (a layer another
 * one answers for). A procedure with no scope key keeps its input as it is.
 */
export function mergeScope(
	ids: ScopeIds,
	input: unknown,
	procedure: string,
	key: string | null,
	lenient = false,
): unknown {
	if (key === null) return input;
	if (typeof input === "function") {
		// An infinite query's input is a function of the page param.
		return (...args: unknown[]) =>
			mergeScope(ids, input(...args), procedure, key, lenient);
	}
	if (!isMergeable(input)) return input;
	if ((input as Record<string, unknown> | undefined)?.[key] !== undefined) {
		return input;
	}
	const id = ids[key];
	if (id === undefined) {
		if (lenient) return input;
		throw new Error(
			`${procedure} is scoped to ${key}: render it under a ScopeBoundary that supplies ${key}, or pass ${key}.`,
		);
	}
	return { ...input, [key]: id };
}
