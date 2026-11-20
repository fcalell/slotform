import {
	BIOME_SPEC,
	TS_MORPH_SPEC,
	TYPES_NODE_SPEC,
	TYPESCRIPT_SPEC,
} from "../lib/manifest.ts";
import {
	PACKAGE_MANAGER,
	slotformPluginSpecs,
	slotformSpec,
} from "../lib/slotform-packages.ts";
import { extendsNodeTsx, isSplit, tsconfigLayout } from "./tsconfig.ts";

// The React an app with a DOM or native side compiles against.
const REACT_SPEC = "^19.3.0";

interface PackageJsonOptions {
	name: string;
	plugins: string[];
	// The app sits in the Slotform workspace: it lints under the checkout's
	// root Biome config and takes the root's package manager.
	workspace: boolean;
}

export function packageJsonTemplate(options: PackageJsonOptions): string {
	const deps: Record<string, string> = {};
	const devDeps: Record<string, string> = {
		"@slotform/cli": slotformSpec(),
		"@slotform/typescript-config": slotformSpec(),
		typescript: TYPESCRIPT_SPEC,
		// The CLI's optional peer: `slotform generate` prints its TypeScript with it.
		"ts-morph": TS_MORPH_SPEC,
	};
	if (!options.workspace) {
		devDeps["@slotform/biome-config"] = slotformSpec();
		// biome-config only carries config; the `lint`/`check` scripts need the
		// Biome binary itself on the consumer's PATH.
		devDeps["@biomejs/biome"] = BIOME_SPEC;
	}

	const layout = tsconfigLayout(options.plugins);
	if (extendsNodeTsx(layout)) devDeps["@types/node"] = TYPES_NODE_SPEC;

	const hasNative = layout.native;
	const hasReactDom = options.plugins.includes("react");
	if (hasNative || hasReactDom) {
		// React's types back the app's JSX (`react/jsx-runtime`) so the app's
		// tsconfig resolves the automatic runtime.
		devDeps["@types/react"] = REACT_SPEC;
	}
	if (hasReactDom) {
		deps.react = REACT_SPEC;
		deps["react-dom"] = REACT_SPEC;
		devDeps["@types/react-dom"] = REACT_SPEC;
	}

	Object.assign(deps, slotformPluginSpecs(options.plugins));

	const pkg: Record<string, unknown> = {
		name: options.name,
		version: "0.0.0",
		private: true,
		type: "module",
	};
	if (!options.workspace) pkg.packageManager = PACKAGE_MANAGER;

	if (layout.web) {
		pkg.imports = { "#/*": "./src/*" };
	}

	const scripts: Record<string, string> = {
		generate: "slotform generate",
		dev: "slotform dev",
		build: "slotform build",
		deploy: "slotform deploy",
		// An app with a worker is a solution of two projects, which only
		// `tsc -b` checks: `--noEmit` on its `files: []` root checks nothing.
		"check-types": isSplit(layout) ? "tsc -b" : "tsc --noEmit",
	};
	if (!options.workspace) {
		scripts.lint = "biome check --write --unsafe";
		scripts.check = "pnpm check-types && biome check";
	}

	pkg.scripts = scripts;
	pkg.dependencies = sortKeys(deps);
	pkg.devDependencies = sortKeys(devDeps);

	return `${JSON.stringify(pkg, null, "\t")}\n`;
}

function sortKeys(obj: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)),
	);
}
