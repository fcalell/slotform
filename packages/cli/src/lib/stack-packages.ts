import { pluginPackage } from "./first-party.ts";
import { cliManifest } from "./manifest.ts";

// The package manager a scaffolded project outside stack's workspace pins.
// 11.28.4 is the first whose frozen install does not link a skipped optional
// dependency (fsevents on Linux) or an unresolved optional peer to the working
// directory, a link Vite's watcher then loads as the module (pnpm#16454).
export const PACKAGE_MANAGER = "pnpm@11.28.4";

// Every first-party package a consumer installs: docs/architecture/releasing.md, "What is published".
export const STACK_PACKAGES = {
	"@fcalell/cli": {
		dir: "packages/cli",
		dependencies: [],
	},
	"@fcalell/typescript-config": {
		dir: "packages/typescript-config",
		dependencies: [],
	},
	"@fcalell/biome-config": { dir: "packages/biome-config", dependencies: [] },
	"@fcalell/ui-core": { dir: "packages/ui-core", dependencies: [] },
	"@fcalell/plugin-api": { dir: "plugins/api", dependencies: ["@fcalell/cli"] },
	"@fcalell/plugin-auth": {
		dir: "plugins/auth",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-api",
			"@fcalell/plugin-cloudflare",
			"@fcalell/plugin-db",
			"@fcalell/plugin-screens",
		],
		// better-auth's Prisma adapter auto-installs its peer; auth uses Drizzle.
		// Its better-sqlite3 ^12 peer installs beside plugin-db's 13 and builds
		// its binding by install script; pnpm may hoist it as drizzle-kit's driver.
		builds: { "@prisma/client": false, "better-sqlite3": true },
	},
	"@fcalell/plugin-cloudflare": {
		dir: "plugins/cloudflare",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-api",
			"@fcalell/plugin-screens",
			"@fcalell/plugin-vite",
		],
		// The wrangler it adds to the app's devDependencies.
		builds: { esbuild: true, workerd: true },
	},
	"@fcalell/plugin-db": {
		dir: "plugins/db",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-api",
			"@fcalell/plugin-cloudflare",
			"@fcalell/plugin-node",
			"@fcalell/plugin-screens",
		],
		// drizzle-kit's esbuild. better-sqlite3 13 ships prebuilt binaries and
		// declares no build (`gypfile: false`).
		builds: { esbuild: true },
	},
	"@fcalell/plugin-expo": {
		dir: "plugins/expo",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-api",
			"@fcalell/plugin-cloudflare",
			"@fcalell/ui-core",
		],
		// Expo's logger reaches bunyan, whose optional DTrace probes compile
		// natively; logging works without them. eas-cli reaches protobufjs, whose
		// postinstall only warns about a dependent's version scheme.
		builds: { "dtrace-provider": false, protobufjs: false },
	},
	"@fcalell/plugin-native-ui": {
		dir: "plugins/native-ui",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-api",
			"@fcalell/plugin-auth",
			"@fcalell/plugin-expo",
			"@fcalell/ui-core",
		],
	},
	"@fcalell/plugin-node": {
		dir: "plugins/node",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-api",
			"@fcalell/plugin-query",
			"@fcalell/plugin-screens",
			"@fcalell/plugin-vite",
			"@fcalell/ui-core",
		],
		// The esbuild that bundles the server.
		builds: { esbuild: true },
	},
	"@fcalell/plugin-query": {
		dir: "plugins/query",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-api",
			"@fcalell/plugin-react",
			"@fcalell/plugin-vite",
			"@fcalell/ui-core",
		],
	},
	"@fcalell/plugin-react": {
		dir: "plugins/react",
		dependencies: ["@fcalell/cli", "@fcalell/plugin-vite"],
	},
	"@fcalell/plugin-react-ui": {
		dir: "plugins/react-ui",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-auth",
			"@fcalell/plugin-react",
			"@fcalell/plugin-screens",
			"@fcalell/plugin-vite",
			"@fcalell/ui-core",
		],
	},
	"@fcalell/plugin-screens": {
		dir: "plugins/screens",
		dependencies: [
			"@fcalell/cli",
			"@fcalell/plugin-api",
			"@fcalell/plugin-query",
			"@fcalell/plugin-react",
			"@fcalell/plugin-vite",
			"@fcalell/ui-core",
		],
		// msw reaches the app as its own dependency (`stack add screens`); its
		// postinstall only prints, the worker file is served from its package.
		builds: { msw: false },
	},
	"@fcalell/plugin-vite": {
		dir: "plugins/vite",
		dependencies: ["@fcalell/cli", "@fcalell/plugin-api"],
	},
} as const satisfies Record<
	string,
	{
		dir: string;
		dependencies: readonly string[];
		builds?: Readonly<Record<string, boolean>>;
	}
>;

export type StackPackage = keyof typeof STACK_PACKAGES;

export function isStackPackage(name: string): name is StackPackage {
	return Object.hasOwn(STACK_PACKAGES, name);
}

// The given packages and every first-party package their `dependencies`
// reach, sorted by name.
export function stackClosure(names: Iterable<StackPackage>): StackPackage[] {
	const seen = new Set<StackPackage>();
	const visit = (name: StackPackage): void => {
		if (seen.has(name)) return;
		seen.add(name);
		for (const dep of STACK_PACKAGES[name].dependencies) visit(dep);
	};
	for (const name of names) visit(name);
	return [...seen].sort();
}

// A package's spec, the caret of the one version every stack package is
// published at: docs/architecture/releasing.md, "The version rule".
export function stackSpec(): string {
	return `^${cliManifest.version}`;
}

// Each first-party plugin's package, by plugin name, with its spec.
export function stackPluginSpecs(
	plugins: Iterable<string>,
): Record<string, string> {
	const specs: Record<string, string> = {};
	for (const name of plugins) {
		const pkgName = pluginPackage(name);
		if (isStackPackage(pkgName)) specs[pkgName] = stackSpec();
	}
	return specs;
}
