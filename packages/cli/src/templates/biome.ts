import type { LintPlugin } from "../specs.ts";

// An app in stack's workspace extends the checkout's root config: docs/architecture/consumer-project.md, "Inside stack's workspace".
//
// TODO: Biome 2.4 takes the `//` shorthand for the root only as a lone `extends` string. Use
// `["//", "./.stack/biome.json"]` once an `extends` array takes it.
export function biomeTemplate(options: { rootConfig: string | null }): string {
	const config = options.rootConfig
		? { root: false, extends: [options.rootConfig, "./.stack/biome.json"] }
		: {
				// The installed biome's own schema, so it never lags the version.
				$schema: "./node_modules/@biomejs/biome/configuration_schema.json",
				extends: ["@fcalell/biome-config/shared.json", "./.stack/biome.json"],
			};

	return `${JSON.stringify(config, null, "\t")}\n`;
}

export const LINT_PATH = ".stack/biome.json";

// `.stack/biome.json`, the plugins' rules and ignores: docs/architecture/consumer-project.md, "Lint".
//
// TODO: Biome resolves a plugin path against the root config's directory and takes no `includes`
// on a plugin entry, so a package's file is spelled under `node_modules/` and `includes` sits in an
// override. Drop both when Biome resolves `@scope/pkg/file.grit` and takes per-plugin `includes`
// (2.5's object form).
export function lintConfig(
	plugins: readonly LintPlugin[],
	ignore: readonly string[],
): string {
	const byIncludes = new Map<string, { includes: string[]; paths: string[] }>();
	for (const { path, includes } of plugins) {
		const key = JSON.stringify(includes);
		const group = byIncludes.get(key) ?? { includes, paths: [] };
		group.paths.push(`node_modules/${path}`);
		byIncludes.set(key, group);
	}
	const overrides: object[] = [...byIncludes.values()].map(
		({ includes, paths }) => ({ includes, plugins: paths }),
	);
	if (ignore.length > 0) {
		overrides.push({
			// Each entry as a file and as a directory's contents.
			includes: ignore.flatMap((glob) => [glob, `${glob}/**`]),
			linter: { enabled: false },
			formatter: { enabled: false },
			assist: { enabled: false },
		});
	}
	return `${JSON.stringify({ root: false, overrides }, null, "\t")}\n`;
}
