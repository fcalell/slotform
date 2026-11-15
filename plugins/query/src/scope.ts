import {
	mergeScope,
	type ScopeIds,
	type ScopeSchema,
} from "@fcalell/ui-core/scope";

// The route's scope set on oRPC's query utils: every call of a scoped
// procedure takes the registered ids (`@fcalell/ui-core/scope`) in its input
// before the query key is built, so the id stays in the key and two scopes never
// share a cache entry.

// The utils methods that take the call's input in their options. A key built
// without an input is a prefix (`orpc.projects.list.key()` matches every
// scope's list), so the keys merge only an input they were given; the options
// always do, since a call with no input names its scope by the boundary alone.
const KEYS = new Set([
	"key",
	"queryKey",
	"infiniteKey",
	"experimental_streamedKey",
	"experimental_liveKey",
]);
const OPTIONS = new Set([
	"queryOptions",
	"infiniteOptions",
	"experimental_streamedOptions",
	"experimental_liveOptions",
]);

type Fn = (...args: unknown[]) => unknown;

/**
 * oRPC's query utils with the scope key of each scoped procedure (`schema`) set
 * from `ids()` in the input of every call: `queryOptions`, `infiniteOptions`, the
 * keys, `call`, and the `mutationFn` of `mutationOptions`. The merge precedes the
 * key, which carries the id. A procedure the schema does not name, or names with
 * no scope, is left as it is.
 */
export function withScope(
	// biome-ignore lint/suspicious/noExplicitAny: oRPC's utils proxy is dynamically typed
	target: any,
	ids: () => ScopeIds,
	schema: ScopeSchema,
	// biome-ignore lint/suspicious/noExplicitAny: oRPC's utils proxy is dynamically typed
): any {
	return layer(target, ids, schema, [], false);
}

function layer(
	// biome-ignore lint/suspicious/noExplicitAny: oRPC's utils proxy is dynamically typed
	target: any,
	ids: () => ScopeIds,
	schema: ScopeSchema,
	path: readonly string[],
	lenient: boolean,
	// biome-ignore lint/suspicious/noExplicitAny: oRPC's utils proxy is dynamically typed
): any {
	return new Proxy(target, {
		get(_, key) {
			const value = Reflect.get(target, key);
			if (typeof key !== "string") return value;
			const own = [...path, key];
			if (typeof value === "function") {
				const method = methodOf(key, value as Fn, ids, schema, path, lenient);
				if (method) {
					// A procedure named like a method keeps its utils, as in `withRead`.
					const child = layer(value, ids, schema, own, lenient);
					return new Proxy(method, { get: (_, k) => Reflect.get(child, k) });
				}
			}
			return value !== null &&
				(typeof value === "object" || typeof value === "function")
				? layer(value, ids, schema, own, lenient)
				: value;
		},
	});
}

// `path` is the procedure the method belongs to.
function methodOf(
	key: string,
	value: Fn,
	ids: () => ScopeIds,
	schema: ScopeSchema,
	path: readonly string[],
	lenient: boolean,
): Fn | undefined {
	const procedure = path.join(".");
	const merge = (input: unknown) =>
		mergeScope(
			ids(),
			input,
			procedure,
			schema[procedure]?.scope ?? null,
			lenient,
		);
	if (KEYS.has(key)) {
		return (options, ...rest) =>
			value(
				options && typeof options === "object" && "input" in options
					? { ...options, input: merge(options.input) }
					: options,
				...rest,
			);
	}
	if (OPTIONS.has(key)) {
		return (options, ...rest) =>
			value(
				{
					...(options as object | undefined),
					input: merge((options as { input?: unknown })?.input),
				},
				...rest,
			);
	}
	if (key === "call" || key === "read" || key === "pages") {
		return (input, ...rest) => value(merge(input), ...rest);
	}
	if (key === "mutationOptions") {
		return (...args) => {
			const built = value(...args) as { mutationFn: Fn };
			return {
				...built,
				mutationFn: (input: unknown, ...rest: unknown[]) =>
					built.mutationFn(merge(input), ...rest),
			};
		};
	}
	return undefined;
}

/**
 * The utils with `scope` fixed, for a call made outside any boundary: a route
 * `loader` runs before the boundary renders, so it names the ids it resolved.
 * Nested calls extend (`scoped(scoped(utils, { organizationId }), { projectId })`):
 * a layer sets the keys it holds and leaves the rest to the layers beneath, down
 * to the registered scope, which throws for a key no layer names.
 */
export function scoped<U>(utils: U, scope: ScopeIds, schema: ScopeSchema): U {
	return layer(utils, () => scope, schema, [], true);
}
