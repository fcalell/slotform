import type { LintPlugin } from "../specs.ts";

export const LINT_PATH = ".stack/biome.json";

// An app in stack's workspace extends the checkout's root config: docs/architecture/consumer-project.md, "Inside stack's workspace".
//
// TODO: Biome 2.4 takes the `//` shorthand for the root only as a lone `extends` string. Use
// `["//", "./.stack/biome.json"]` once an `extends` array takes it.
export function biomeTemplate(options: { rootConfig: string | null }): string {
	const lint = `./${LINT_PATH}`;
	const config = options.rootConfig
		? { root: false, extends: [options.rootConfig, lint] }
		: {
				// The installed biome's own schema, so it never lags the version.
				$schema: "./node_modules/@biomejs/biome/configuration_schema.json",
				extends: ["@fcalell/biome-config/shared.json", lint],
			};

	return `${JSON.stringify(config, null, "\t")}\n`;
}

// `.stack/biome.json`, the plugins' rules and ignores: docs/architecture/consumer-project.md, "Lint".
//
// TODO: Biome 2.6 reads a package name in a plugin `path` as a Biome plugin package, which needs a
// `biome-manifest.json` at its root, so a package's `.grit` file is spelled under `node_modules/`.
// Name the package once Biome resolves a file path inside a package that has no manifest.
export function lintConfig(
	plugins: readonly LintPlugin[],
	ignore: readonly string[],
): string {
	const entries = plugins.map(({ path, includes }) => ({
		path: `node_modules/${path}`,
		includes,
	}));
	const overrides: object[] = [];
	if (ignore.length > 0) {
		overrides.push({
			// Each entry as a file and as a directory's contents.
			includes: ignore.flatMap((glob) => [glob, `${glob}/**`]),
			linter: { enabled: false },
			formatter: { enabled: false },
			assist: { enabled: false },
		});
	}
	return `${JSON.stringify({ root: false, plugins: entries, overrides }, null, "\t")}\n`;
}
