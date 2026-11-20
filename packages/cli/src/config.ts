// ── Plugin config type ──────────────────────────────────────────────

export interface PluginConfig<
	TName extends string = string,
	TOptions = unknown,
	TInput = unknown,
> {
	readonly __plugin: TName;
	// `__package` is the npm name discovery imports: docs/architecture/plugin-authoring.md, "Plugin discovery".
	readonly __package: string;
	readonly options: TOptions;
	// Type-only: the caller's literal input, never set at runtime.
	readonly __input?: TInput;
}

// ── Validation types ────────────────────────────────────────────────

export interface ValidationError {
	plugin: string;
	message: string;
	fix?: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
}

// ── App config ──────────────────────────────────────────────────────

// AppConfig: docs/architecture/consumer-project.md, "Config".
export interface AppConfig {
	name: string;
	domain: string;
	origins?: string[];
}

// ── Slotform config ─────────────────────────────────────────────────

export interface SlotformConfig<
	T extends readonly PluginConfig[] = readonly PluginConfig[],
> {
	app: AppConfig;
	plugins: T;
	validate(): ValidationResult;
}

// ── Plugin extraction ───────────────────────────────────────────────

export type ExtractPlugin<
	T extends readonly PluginConfig[],
	N extends string,
> = Extract<T[number], { __plugin: N }>;

export function getPlugin<T extends readonly PluginConfig[], N extends string>(
	config: SlotformConfig<T>,
	name: N,
): ExtractPlugin<T, N> {
	const found = config.plugins.find((p) => p.__plugin === name);
	if (!found) throw new Error(`Plugin "${name}" not found in config`);
	// `find` answers the union member type; the compiler cannot narrow it by the `__plugin` name.
	return found as ExtractPlugin<T, N>;
}

// ── defineConfig ────────────────────────────────────────────────────

export function defineConfig<const T extends readonly PluginConfig[]>(input: {
	app: AppConfig;
	plugins: T;
}): SlotformConfig<T> {
	return {
		app: input.app,
		plugins: input.plugins,
		validate() {
			const errors: ValidationError[] = [];

			if (!input.app || typeof input.app !== "object") {
				errors.push({
					plugin: "app",
					message: "app is required (expected { name, domain })",
				});
			} else {
				if (
					typeof input.app.name !== "string" ||
					input.app.name.trim() === ""
				) {
					errors.push({ plugin: "app", message: "app.name is required" });
				}
				if (
					typeof input.app.domain !== "string" ||
					input.app.domain.trim() === ""
				) {
					errors.push({ plugin: "app", message: "app.domain is required" });
				}
			}

			const seen = new Set<string>();
			for (const plugin of input.plugins) {
				if (typeof plugin?.__plugin !== "string" || plugin.__plugin === "") {
					errors.push({
						plugin: "(unknown)",
						message:
							"Plugin entry is missing __plugin. Use the factory returned by plugin() instead of constructing config objects by hand.",
					});
					continue;
				}
				if (typeof plugin.__package !== "string" || plugin.__package === "") {
					errors.push({
						plugin: plugin.__plugin,
						message: `Plugin "${plugin.__plugin}" is missing __package. Call its factory (e.g. ${plugin.__plugin}()) — plugin() stamps __package automatically; hand-authored entries must set it explicitly.`,
					});
				}
				if (seen.has(plugin.__plugin)) {
					errors.push({
						plugin: plugin.__plugin,
						message: `Duplicate plugin: "${plugin.__plugin}" appears more than once.`,
					});
				}
				seen.add(plugin.__plugin);
			}

			return { valid: errors.length === 0, errors };
		},
	};
}
