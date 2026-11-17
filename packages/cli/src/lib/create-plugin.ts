import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { z } from "zod";
import type { ScaffoldSpec } from "../ast/index.ts";
import type { AppConfig } from "../config.ts";
import { cliSlots } from "./cli-slots.ts";
import { StackError } from "./errors.ts";
import { findPackageInfo } from "./package-info.ts";
import type { Contribution, Slot } from "./slots.ts";

// ── Callback marker ────────────────────────────────────────────────
//
// `__optional` discriminates required vs optional at the type level — when
// the literal `true`, the callback is dropped from required handlers and
// added to the optional map in `InferCallbackPayloads`.

// `R` is the handler's whole return type, not the resolved value: a callback
// the framework awaits declares `void | Promise<void>` (the default), one read
// synchronously declares exactly what it may return. `R` sits in a function
// return position, not directly on the property: inferring through an
// optional property strips `undefined` from the union, which would collapse
// a declared `string | undefined` to `string`.
export interface CallbackMarker<T, R = void | Promise<void>> {
	readonly __type?: T;
	readonly __return?: () => R;
	readonly __optional?: boolean;
}

export type OptionalCallbackMarker<
	T,
	R = void | Promise<void>,
> = CallbackMarker<T, R> & {
	readonly __optional: true;
};

interface CallbackFactory {
	<
		T extends Record<string, unknown>,
		R = void | Promise<void>,
	>(): CallbackMarker<T, R>;
	optional: <
		T extends Record<string, unknown>,
		R = void | Promise<void>,
	>() => OptionalCallbackMarker<T, R>;
}

export const callback: CallbackFactory = Object.assign(
	<
		T extends Record<string, unknown>,
		R = void | Promise<void>,
	>(): CallbackMarker<T, R> => ({}),
	{
		optional: <
			T extends Record<string, unknown>,
			R = void | Promise<void>,
		>(): OptionalCallbackMarker<T, R> => ({ __optional: true }) as const,
	},
);

// CommandContext: docs/architecture/commands.md, "Plugin subcommands".

export interface LogContext {
	info(msg: string): void;
	warn(msg: string): void;
	success(msg: string): void;
	error(msg: string): void;
}

export interface PromptContext {
	text(msg: string, opts?: { default?: string }): Promise<string>;
	confirm(msg: string): Promise<boolean>;
	select<T>(msg: string, options: { label: string; value: T }[]): Promise<T>;
	multiselect<T>(
		msg: string,
		options: { label: string; value: T }[],
	): Promise<T[]>;
}

export interface CommandContext<TOptions> {
	options: TOptions;
	cwd: string;
	resolve<T>(slot: Slot<T>): Promise<T>;
	// Runs the pipeline `stack generate` runs, in process: every artifact is
	// written and every postWrite hook has run when it resolves. `resolve` keeps
	// answering from the graph built before.
	generate(): Promise<void>;
	log: LogContext;
	prompt: PromptContext;
}

// ── Command definition ─────────────────────────────────────────────

export interface FlagDefinition {
	type: "boolean" | "string" | "number";
	description: string;
	default?: unknown;
	alias?: string;
}

export interface CommandDefinition<TOptions, TFlags = Record<string, never>> {
	description: string;
	options?: { [K in keyof TFlags]: FlagDefinition };
	handler(ctx: CommandContext<TOptions>, flags: TFlags): Promise<void>;
}

// ── Plugin definition ──────────────────────────────────────────────

// The `self` helper of a function-form `contributes`: docs/architecture/plugin-authoring.md, "Options via `schema`".
export interface PluginSelf<TSlots, TResolvedOptions> {
	slots: TSlots;
	options: TResolvedOptions;
	app: AppConfig;
}

type ContributionsInput<TSlots, TResolvedOptions> =
	| Contribution<unknown>[]
	| ((self: PluginSelf<TSlots, TResolvedOptions>) => Contribution<unknown>[]);

export interface PluginDefinition<
	TOptions,
	TSlots extends Record<string, Slot<unknown>>,
	TCallbacks extends Record<
		string,
		CallbackMarker<unknown, unknown> | OptionalCallbackMarker<unknown, unknown>
	>,
	TResolvedOptions = TOptions,
> {
	label: string;
	// Explicit npm package name: docs/architecture/plugin-authoring.md, "Plugin discovery".
	package?: string;

	// Options schema, input and output types: docs/architecture/plugin-authoring.md, "Options via `schema`".
	schema?: z.ZodType<TResolvedOptions, TOptions>;

	// Presence-only dependency: docs/architecture/slot-graph.md, "`requires`".
	requires?:
		| readonly Requirement[]
		| ((options: TResolvedOptions) => readonly Requirement[]);

	// Slots owned by this plugin. Exposed on the returned factory as
	// `.slots` so other plugins can contribute to them.
	slots?: TSlots;

	// Contributions to any plugin's (own or otherwise) slots. Accepts either
	// an array directly or a function that receives `self` so the plugin
	// can reference its own slots without a circular reference problem.
	contributes?: ContributionsInput<TSlots, TResolvedOptions>;

	commands?: Record<
		string,
		CommandDefinition<TResolvedOptions, Record<string, unknown>>
	>;

	callbacks?: TCallbacks;

	// Footprint declarations, auto-wired into the `cliSlots` lists: docs/architecture/plugin-authoring.md, "The `plugin()` contract".
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	gitignore?: readonly string[];

	// The plugin's guide pages: docs/architecture/plugin-authoring.md, "The `plugin()` contract".
	guide?: readonly { page: string; trigger: string }[];
}

// A sibling plugin that must be in the config: docs/architecture/slot-graph.md, "`requires`".
export type Requirement = string | OneOfRequirement;

export interface OneOfRequirement {
	readonly oneOf: readonly [string, string, ...string[]];
}

// ── Internal CLI-facing descriptor ─────────────────────────────────

// Everything the CLI needs to route subcommands and drive discovery. The
// factory exposes this as `.cli` so existing call sites that read
// `plugin.cli.name` / `plugin.cli.commands` keep working; `collect(ctx)` is
// the new entry point for Phase D command code that builds the slot graph.
export interface InternalCliPlugin<TOptions, TSlots, TResolvedOptions> {
	name: string;
	label: string;
	package: string;
	requires: (options: unknown) => readonly Requirement[];
	callbacks: Record<
		string,
		CallbackMarker<unknown, unknown> | OptionalCallbackMarker<unknown, unknown>
	>;
	commands: Record<
		string,
		CommandDefinition<TResolvedOptions, Record<string, unknown>>
	>;
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
	gitignore: readonly string[];
	schema?: z.ZodType<TResolvedOptions, TOptions>;
	// Plugin-scoped template and scaffold resolvers: docs/architecture/plugin-authoring.md, "Templates".
	template(name: string): URL;
	scaffold(name: string, target: string): ScaffoldSpec;
	// Per-config invocation: resolve the plugin's slots + contributions
	// against the validated options carried by the plugin's `PluginConfig`.
	// Returns the shape `buildGraph` consumes.
	collect(ctx: CollectCtx<TResolvedOptions>): {
		slots: TSlots;
		contributes: Contribution<unknown>[];
	};
}

// Arguments `collect()` needs to stamp the right `options` / `app` onto the
// `self` helper passed to a function-form `contributes`.
export interface CollectCtx<TResolvedOptions> {
	app: AppConfig;
	options: TResolvedOptions;
}

// ── Plugin factory type ────────────────────────────────────────────
//
// The returned factory is callable (`db({ dialect: "d1" })` → PluginConfig)
// and exposes the plugin's metadata. `defineCallbacks` is only present when
// callbacks were declared — narrowed via the same conditional intersection
// pattern used before.

type InferCallbackPayloads<
	T extends Record<
		string,
		CallbackMarker<unknown, unknown> | OptionalCallbackMarker<unknown, unknown>
	>,
> = {
	[K in keyof T as T[K] extends { readonly __optional: true }
		? never
		: K]: T[K] extends CallbackMarker<infer P, infer R>
		? (payload: P) => R
		: never;
} & {
	[K in keyof T as T[K] extends { readonly __optional: true }
		? K
		: never]?: T[K] extends CallbackMarker<infer P, infer R>
		? (payload: P) => R
		: never;
};

// A key the options do not declare maps to `never`, at every depth: inferring
// the input as a type parameter skips the excess-property check that would
// catch a typo. `unknown` options (a factory typed without its schema, an
// option the schema leaves open) declare every key.
type KnownKeys<I, T> = unknown extends T
	? I
	: I extends (...args: never[]) => unknown
		? I
		: I extends readonly unknown[]
			? {
					[K in keyof I]: KnownKeys<
						I[K],
						Extract<T, readonly unknown[]>[number]
					>;
				}
			: I extends object
				? {
						[K in keyof I]: K extends keyof Extract<T, object>
							? KnownKeys<I[K], Extract<T, object>[K]>
							: never;
					}
				: I;

// The call infers the caller's literal input `I` and keeps it on the entry as
// the type-only `__input`, so a type derived from the config (auth's
// `InferSession`) reads what was configured, not the resolved options' union.
export type PluginFactory<
	TName extends string,
	TOptions,
	TSlots extends Record<string, Slot<unknown>>,
	TCallbacks extends Record<
		string,
		CallbackMarker<unknown, unknown> | OptionalCallbackMarker<unknown, unknown>
	>,
	TResolvedOptions = TOptions,
> = (<const I extends TOptions = TOptions>(
	...args: [options: I & KnownKeys<I, TOptions>] | []
) => {
	readonly __plugin: TName;
	readonly __package: string;
	readonly options: NonNullable<TResolvedOptions>;
	readonly __input?: I;
}) & {
	name: TName;
	package: string;
	requires: (options: unknown) => readonly Requirement[];
	slots: TSlots;
	cli: InternalCliPlugin<TOptions, TSlots, TResolvedOptions>;
} & (TCallbacks extends Record<string, never>
		? // biome-ignore lint/complexity/noBannedTypes: `{}` is a non-restrictive intersection that preserves the LHS; `Record<string, never>` would destroy it and `object` adds an unwanted constraint
			{}
		: {
				defineCallbacks: (
					impl: InferCallbackPayloads<TCallbacks>,
				) => InferCallbackPayloads<TCallbacks>;
			});

// ── plugin() ───────────────────────────────────────────────────────

export function plugin<
	TName extends string,
	TOptions,
	const TSlots extends Record<string, Slot<unknown>> = Record<string, never>,
	TCallbacks extends Record<
		string,
		CallbackMarker<unknown, unknown> | OptionalCallbackMarker<unknown, unknown>
	> = Record<string, never>,
	TResolvedOptions = TOptions,
>(
	name: TName,
	definition: PluginDefinition<TOptions, TSlots, TCallbacks, TResolvedOptions>,
): PluginFactory<TName, TOptions, TSlots, TCallbacks, TResolvedOptions> {
	const pkg = definition.package ?? `@fcalell/plugin-${name}`;
	// Looked up on first use, never on import: docs/architecture/plugin-authoring.md, "Plugin discovery".
	const packageInfo = () => findPackageInfo(pkg);
	const hasCallbacks =
		definition.callbacks !== undefined &&
		Object.keys(definition.callbacks).length > 0;
	const callbackTarget = `src/worker/plugins/${name}.ts`;
	const declared = definition.requires ?? [];
	// `stack init` and `stack add` pass `{}`, which the schema fills with its
	// defaults.
	const requires = (options: unknown): readonly Requirement[] => {
		if (typeof declared !== "function") return declared;
		const schema = definition.schema;
		return declared(
			// Without a schema the options are their own resolved form; `unknown` hides it.
			schema ? schema.parse(options ?? {}) : (options as TResolvedOptions),
		);
	};

	const template = (templateName: string): URL => {
		const root = packageInfo()?.root;
		if (!root) {
			throw new StackError(
				`Plugin "${name}" attempted to resolve template ${JSON.stringify(templateName)} but its package "${pkg}" could not be located. Ensure it is installed in the consumer workspace.`,
				"PLUGIN_CONFIG_INVALID",
			);
		}
		return new URL(templateName, pathToFileURL(`${join(root, "templates")}/`));
	};

	const _scaffold = (templateName: string, target: string): ScaffoldSpec => ({
		source: template(templateName),
		target,
		plugin: name,
	});

	// `{}` stands in for TSlots' default, `Record<string, never>`, which the compiler cannot match to the omitted case.
	const slots = (definition.slots ?? {}) as TSlots;

	function autoContributions(): Contribution<unknown>[] {
		const auto: Contribution<unknown>[] = [];

		// Auto-wire dependency declarations into the CLI's init/remove slots.
		// Plugins can still add extra contributions in `contributes` — nothing
		// here is exclusive.
		if (definition.dependencies) {
			const deps = definition.dependencies;
			auto.push(cliSlots.initDeps.contribute(() => ({ ...deps })));
			auto.push(cliSlots.removeDeps.contribute(() => Object.keys(deps)));
		}
		if (definition.devDependencies) {
			const devDeps = definition.devDependencies;
			auto.push(cliSlots.initDevDeps.contribute(() => ({ ...devDeps })));
			auto.push(cliSlots.removeDevDeps.contribute(() => Object.keys(devDeps)));
		}
		if (definition.gitignore && definition.gitignore.length > 0) {
			const entries = [...definition.gitignore];
			auto.push(cliSlots.gitignore.contribute(() => entries));
		}
		if (definition.guide && definition.guide.length > 0) {
			const entries = definition.guide.map((e) => ({
				domain: name,
				package: pkg,
				...e,
			}));
			auto.push(cliSlots.guide.contribute(() => entries));
		}

		// Auto-scaffolded callback file: docs/architecture/plugin-authoring.md, "Typed callbacks".
		const packageExports = packageInfo()?.exports;
		if (hasCallbacks && packageExports && "./runtime" in packageExports) {
			auto.push(
				cliSlots.initScaffolds.contribute(
					(): ScaffoldSpec => ({
						source: template("callbacks.ts"),
						target: callbackTarget,
						plugin: name,
					}),
				),
			);
			auto.push(cliSlots.removeFiles.contribute(() => callbackTarget));
		}

		return auto;
	}

	function collect(ctx: CollectCtx<TResolvedOptions>): {
		slots: TSlots;
		contributes: Contribution<unknown>[];
	} {
		const userContribs: Contribution<unknown>[] =
			typeof definition.contributes === "function"
				? definition.contributes({
						slots,
						options: ctx.options,
						app: ctx.app,
					})
				: (definition.contributes ?? []);

		// `collect()` runs once per owning plugin, so the stamp is the owner's name: docs/architecture/plugin-authoring.md, "Options via `schema`".
		return {
			slots,
			contributes: [...userContribs, ...autoContributions()].map((c) => ({
				...c,
				plugin: name,
			})),
		};
	}

	const cli: InternalCliPlugin<TOptions, TSlots, TResolvedOptions> = {
		name,
		label: definition.label,
		package: pkg,
		requires,
		callbacks: definition.callbacks ?? {},
		commands: definition.commands ?? {},
		dependencies: definition.dependencies ?? {},
		devDependencies: definition.devDependencies ?? {},
		gitignore: definition.gitignore ?? [],
		schema: definition.schema,
		template,
		scaffold: _scaffold,
		collect,
	};

	const configFactory = (options?: TOptions) => {
		let validated: TResolvedOptions;
		if (definition.schema) {
			const result = definition.schema.safeParse(options ?? {});
			if (!result.success) {
				const summary = result.error.issues
					.map((issue) => {
						const path = issue.path.length ? issue.path.join(".") : "(root)";
						return `${path}: ${issue.message}`;
					})
					.join("; ");
				throw new StackError(
					`Invalid options for plugin "${name}": ${summary}`,
					"PLUGIN_CONFIG_INVALID",
				);
			}
			validated = result.data;
		} else {
			// Without a schema TResolvedOptions is TOptions; the generic default hides it.
			validated = (options ?? {}) as unknown as TResolvedOptions;
		}
		return {
			__plugin: name,
			__package: pkg,
			options: validated,
		};
	};

	Object.defineProperty(configFactory, "name", {
		value: name,
		writable: false,
		configurable: true,
	});

	const result = Object.assign(configFactory, {
		package: pkg,
		requires,
		slots,
		cli,
	});

	if (hasCallbacks) {
		Object.assign(result, {
			defineCallbacks: <T>(impl: T): T => impl,
		});
	}

	// Object.assign cannot express the call signature, nor the `defineCallbacks` the runtime branch adds.
	return result as unknown as PluginFactory<
		TName,
		TOptions,
		TSlots,
		TCallbacks,
		TResolvedOptions
	>;
}

export type { ContributionCtx } from "./slots.ts";
