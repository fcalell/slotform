import type { Client } from "@orpc/client";

// `TScope`: docs/architecture/plugins/api.md, "Scope".
export interface Procedure<
	TInput = unknown,
	TOutput = unknown,
	TScope extends string = string,
> {
	readonly __brand: "Procedure";
	readonly __input: TInput;
	readonly __output: TOutput;
	readonly __scope: TScope;
}
export type Router = {
	[key: string]: Procedure<unknown, unknown> | Router;
};

// oRPC's own client type: its query utils read the input off `ClientRest`, so
// an input that accepts `undefined` (a schema's `.optional()`) may be left out
// of `.queryOptions()` as well as the call. A plain function with an optional
// parameter loses that.
type ClientCall<TInput, TOutput> = Client<
	Record<never, never>,
	TInput,
	TOutput,
	Error
>;

export type RouterClient<T> = {
	[K in keyof T]: T[K] extends Procedure<infer TIn, infer TOut>
		? ClientCall<TIn, TOut>
		: T[K] extends Record<string, unknown>
			? RouterClient<T[K]>
			: never;
};

// A scoped procedure's input without its scope key, which the boundary above the
// call supplies; the key stays accepted for a call that names another scope
// (explicit wins). An input every key of which is then optional may be left out.
type ScopeOptional<TIn, TScope extends string> = [TScope] extends [never]
	? TIn
	: TIn extends object
		? Omit<TIn, TScope> & Partial<Pick<TIn, TScope & keyof TIn>> extends infer R
			? Record<never, never> extends R
				? R | undefined
				: R
			: never
		: TIn;

// What the query utils wrap: `RouterClient` with every scoped input's scope key
// optional.
export type ScopedRouterClient<T> = {
	[K in keyof T]: T[K] extends Procedure<infer TIn, infer TOut, infer TScope>
		? ClientCall<ScopeOptional<TIn, TScope>, TOut>
		: T[K] extends Record<string, unknown>
			? ScopedRouterClient<T[K]>
			: never;
};

// Env value checks: docs/architecture/plugins/api.md, "Env vars".
export interface EnvValidation {
	minLength?: number;
	url?: boolean;
	devLocalhost?: boolean;
}

// One env var the worker reads: plugins/api/guide/config.md, "Rules".
export interface EnvSpec {
	name: string;
	devDefault: string;
	validate?: EnvValidation;
}
