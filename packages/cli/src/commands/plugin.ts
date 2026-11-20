import { existsSync, mkdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { log, outro } from "@clack/prompts";
import { SlotformError } from "../lib/errors.ts";
import { slotformWorkspaceRoot, toWorkspaceSpecs } from "../lib/install.ts";
import { TYPES_NODE_SPEC, TYPESCRIPT_SPEC } from "../lib/manifest.ts";
import { toCamelCase } from "../lib/naming.ts";
import { writeIfMissingString } from "../lib/scaffold.ts";
import { PACKAGE_MANAGER, slotformSpec } from "../lib/slotform-packages.ts";
import { pnpmWorkspaceTemplate } from "../templates/pnpm-workspace.ts";

interface InitPluginOptions {
	name: string;
	package?: string;
	dir?: string;
}

interface PluginFilesOptions {
	name: string;
	packageName: string;
	// The plugin sits in the Slotform workspace, which installs it: no
	// `pnpm-workspace.yaml` of its own.
	workspace: boolean;
}

// The plugin skeleton's files, by path relative to its directory.
function pluginFiles(options: PluginFilesOptions): Array<[string, string]> {
	const { name, packageName, workspace } = options;
	const label = name
		.split("-")
		.map((part) => (part ? part[0]?.toUpperCase() + part.slice(1) : part))
		.join(" ");
	const files: Array<[string, string]> = [
		[
			"package.json",
			pluginPackageJsonTemplate({ name, packageName, workspace }),
		],
		["tsconfig.json", pluginTsconfigTemplate()],
		["tsconfig.build.json", pluginTsconfigBuildTemplate()],
		["src/index.ts", pluginIndexTemplate({ name, packageName, label })],
		["src/worker/index.ts", pluginRuntimeTemplate({ name })],
		["README.md", pluginReadmeTemplate({ name, packageName, label })],
	];
	if (!workspace) {
		files.push([
			"pnpm-workspace.yaml",
			pnpmWorkspaceTemplate(null, [
				"@slotform/cli",
				"@slotform/typescript-config",
			]),
		]);
	}
	return files;
}

// Scaffolds a plugin skeleton a third-party author can publish as-is.
// Layout: docs/architecture/conventions.md, "Plugin folder structure".
// Inside the Slotform workspace it takes each Slotform package from the workspace: docs/architecture/consumer-project.md, "Inside Slotform's workspace".
export async function initPlugin(options: InitPluginOptions): Promise<void> {
	const name = options.name.trim();
	if (!name) {
		throw new SlotformError(
			"Plugin name is required. Usage: slotform plugin init <name>",
			"PLUGIN_INIT_INVALID_NAME",
		);
	}

	if (!/^[a-z][a-z0-9-]*$/.test(name)) {
		throw new SlotformError(
			`Invalid plugin name: "${name}". Use lowercase letters, digits, and dashes (e.g. "my-plugin").`,
			"PLUGIN_INIT_INVALID_NAME",
		);
	}

	const packageName = options.package ?? `slotform-plugin-${name}`;
	const targetDir = options.dir
		? resolve(options.dir)
		: resolve(process.cwd(), "plugins", name);

	if (!existsSync(targetDir)) {
		mkdirSync(targetDir, { recursive: true });
	}
	const workspace = slotformWorkspaceRoot(targetDir) !== null;

	// The skeleton's paths are relative to the plugin's directory.
	const created: string[] = [];
	for (const [path, content] of pluginFiles({
		name,
		packageName,
		workspace,
	})) {
		if (writeIfMissingString(join(targetDir, path), content))
			created.push(path);
	}

	if (created.length === 0) {
		log.info(
			`No files created — ${basename(targetDir)} already contains a plugin.`,
		);
		return;
	}

	log.success(`Scaffolded ${packageName} in ${targetDir}`);
	log.info(
		[`Next steps:`, `  cd ${targetDir}`, `  pnpm install`, `  pnpm check`].join(
			"\n",
		),
	);
	outro(`Done!`);
}

// PascalCase variant for type names derived from a slug ("widget" -> "Widget",
// "my-widget" -> "MyWidget").
function toPascalCase(name: string): string {
	const camel = toCamelCase(name);
	return camel.charAt(0).toUpperCase() + camel.slice(1);
}

interface PluginPackageJsonOptions {
	name: string;
	packageName: string;
	// The plugin sits in the Slotform workspace: it takes each Slotform package
	// from the workspace and the root's package manager.
	workspace: boolean;
}

function pluginPackageJsonTemplate(options: PluginPackageJsonOptions): string {
	const pkg = {
		name: options.packageName,
		version: "0.0.0",
		type: "module",
		sideEffects: false,
		...(options.workspace ? {} : { packageManager: PACKAGE_MANAGER }),
		exports: {
			".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
			"./runtime": {
				types: "./dist/worker/index.d.ts",
				default: "./dist/worker/index.js",
			},
		},
		files: ["dist", "src", "README.md"],
		license: "MIT",
		scripts: {
			build: "tsc -p tsconfig.build.json",
			prepare: "pnpm build",
			"check-types": "tsc --noEmit --pretty",
			lint: "biome check --write --unsafe",
			check: "pnpm check-types && biome check",
		},
		dependencies: {
			"@slotform/cli": slotformSpec(),
		},
		devDependencies: {
			"@slotform/typescript-config": slotformSpec(),
			"@types/node": TYPES_NODE_SPEC,
			typescript: TYPESCRIPT_SPEC,
		},
	};

	const manifest = options.workspace ? toWorkspaceSpecs(pkg) : pkg;
	return `${JSON.stringify(manifest, null, "\t")}\n`;
}

function pluginTsconfigTemplate(): string {
	const config = {
		extends: "@slotform/typescript-config/node-tsx.json",
		include: ["src"],
	};
	return `${JSON.stringify(config, null, "\t")}\n`;
}

function pluginTsconfigBuildTemplate(): string {
	const config = {
		extends: ["./tsconfig.json", "@slotform/typescript-config/build.json"],
	};
	return `${JSON.stringify(config, null, "\t")}\n`;
}

interface PluginIndexOptions {
	name: string;
	packageName: string;
	label: string;
}

function pluginIndexTemplate(options: PluginIndexOptions): string {
	const { name, packageName, label } = options;
	const varName = toCamelCase(name);
	return `import { plugin, slot } from "@slotform/cli";

export interface ${toPascalCase(name)}Options {
\t// Add plugin-specific options here.
}

// Example slot this plugin owns. Other plugins contribute to it; this
// plugin derives / composes the final value.
const example = slot.list<string>({ source: "${name}", name: "example" });

export const ${varName} = plugin("${name}", {
\tlabel: "${label}",
\tpackage: "${packageName}",

\tslots: { example },

\tdependencies: {
\t\t"${packageName}": "^0.0.0",
\t},

\tcontributes: [
\t\t// example.contribute(() => "hello"),
\t],
});
`;
}

interface PluginRuntimeOptions {
	name: string;
}

// Minimal RuntimePlugin stub so third-party plugins that want worker-side
// behaviour have a starting point. The stub is intentionally no-op — authors
// replace `context()` with their own logic.
function pluginRuntimeTemplate(options: PluginRuntimeOptions): string {
	const { name } = options;
	const varName = toCamelCase(name);
	return `import type { RuntimePlugin } from "@slotform/cli/runtime";

export interface ${toPascalCase(name)}RuntimeOptions {
\t// Runtime options live here. They are plain values read at generate time
\t// and inlined into .slotform/worker.ts as JS literals.
}

export default function ${varName}Runtime(
\t_options: ${toPascalCase(name)}RuntimeOptions = {},
): RuntimePlugin<"${name}"> {
\treturn {
\t\tname: "${name}",
\t\tcontext() {
\t\t\treturn {};
\t\t},
\t};
}
`;
}

interface PluginReadmeOptions {
	name: string;
	packageName: string;
	label: string;
}

function pluginReadmeTemplate(options: PluginReadmeOptions): string {
	const { name, packageName, label } = options;
	return `# ${packageName}

${label} plugin for [\`slotform\`](https://github.com/fcalell/slotform).

## Install

\`\`\`bash
pnpm add ${packageName}
\`\`\`

## Usage

\`\`\`ts
// slotform.config.ts
import { defineConfig } from "@slotform/cli";
import { ${toCamelCase(name)} } from "${packageName}";

export default defineConfig({
  plugins: [${toCamelCase(name)}()],
});
\`\`\`

## Publishing

1. Run \`pnpm check-types\`.
2. Publish: \`pnpm publish --access public\` (\`prepare\` builds \`dist\` first).

## License

MIT
`;
}
