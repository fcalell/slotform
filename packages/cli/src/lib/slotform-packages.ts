import { pluginPackage } from "./first-party.ts";
import { cliManifest } from "./manifest.ts";

// The package manager a scaffolded project outside Slotform's workspace pins.
// 11.28.4 is the first whose frozen install does not link a skipped optional
// dependency (fsevents on Linux) or an unresolved optional peer to the working
// directory, a link Vite's watcher then loads as the module (pnpm#16454).
export const PACKAGE_MANAGER = "pnpm@11.28.4";

// Every first-party package a consumer installs: docs/architecture/releasing.md, "What is published".
export const SLOTFORM_PACKAGES = {
	"@slotform/cli": {
		dir: "packages/cli",
		dependencies: [],
	},
	"@slotform/typescript-config": {
		dir: "packages/typescript-config",
		dependencies: [],
	},
	"@slotform/biome-config": { dir: "packages/biome-config", dependencies: [] },
	"@slotform/ui-core": { dir: "packages/ui-core", dependencies: [] },
	"@slotform/api": { dir: "plugins/api", dependencies: ["@slotform/cli"] },
	"@slotform/auth": {
		dir: "plugins/auth",
		dependencies: [
			"@slotform/cli",
			"@slotform/api",
			"@slotform/cloudflare",
			"@slotform/db",
			"@slotform/screens",
		],
		// better-auth's Prisma adapter auto-installs its peer; auth uses Drizzle.
		// Its better-sqlite3 ^12 peer installs beside `@slotform/db`'s 13 and builds
		// its binding by install script; pnpm may hoist it as drizzle-kit's driver.
		builds: { "@prisma/client": false, "better-sqlite3": true },
	},
	"@slotform/cloudflare": {
		dir: "plugins/cloudflare",
		dependencies: [
			"@slotform/cli",
			"@slotform/api",
			"@slotform/screens",
			"@slotform/vite",
		],
		// The wrangler it adds to the app's devDependencies.
		builds: { esbuild: true, workerd: true },
	},
	"@slotform/db": {
		dir: "plugins/db",
		dependencies: [
			"@slotform/cli",
			"@slotform/api",
			"@slotform/cloudflare",
			"@slotform/node",
			"@slotform/screens",
		],
		// drizzle-kit's esbuild. better-sqlite3 13 ships prebuilt binaries and
		// declares no build (`gypfile: false`).
		builds: { esbuild: true },
	},
	"@slotform/expo": {
		dir: "plugins/expo",
		dependencies: [
			"@slotform/cli",
			"@slotform/api",
			"@slotform/cloudflare",
			"@slotform/ui-core",
		],
		// Expo's logger reaches bunyan, whose optional DTrace probes compile
		// natively; logging works without them. eas-cli reaches protobufjs, whose
		// postinstall only warns about a dependent's version scheme.
		builds: { "dtrace-provider": false, protobufjs: false },
	},
	"@slotform/native-ui": {
		dir: "plugins/native-ui",
		dependencies: [
			"@slotform/cli",
			"@slotform/api",
			"@slotform/auth",
			"@slotform/expo",
			"@slotform/ui-core",
		],
	},
	"@slotform/node": {
		dir: "plugins/node",
		dependencies: [
			"@slotform/cli",
			"@slotform/api",
			"@slotform/query",
			"@slotform/screens",
			"@slotform/vite",
			"@slotform/ui-core",
		],
		// The esbuild that bundles the server.
		builds: { esbuild: true },
	},
	"@slotform/query": {
		dir: "plugins/query",
		dependencies: [
			"@slotform/cli",
			"@slotform/api",
			"@slotform/react",
			"@slotform/vite",
			"@slotform/ui-core",
		],
	},
	"@slotform/react": {
		dir: "plugins/react",
		dependencies: ["@slotform/cli", "@slotform/vite"],
	},
	"@slotform/react-ui": {
		dir: "plugins/react-ui",
		dependencies: [
			"@slotform/cli",
			"@slotform/auth",
			"@slotform/react",
			"@slotform/screens",
			"@slotform/vite",
			"@slotform/ui-core",
		],
	},
	"@slotform/screens": {
		dir: "plugins/screens",
		dependencies: [
			"@slotform/cli",
			"@slotform/api",
			"@slotform/query",
			"@slotform/react",
			"@slotform/vite",
			"@slotform/ui-core",
		],
		// msw reaches the app as its own dependency (`slotform add screens`); its
		// postinstall only prints, the worker file is served from its package.
		builds: { msw: false },
	},
	"@slotform/vite": {
		dir: "plugins/vite",
		dependencies: ["@slotform/cli", "@slotform/api"],
	},
} as const satisfies Record<
	string,
	{
		dir: string;
		dependencies: readonly string[];
		builds?: Readonly<Record<string, boolean>>;
	}
>;

export type SlotformPackage = keyof typeof SLOTFORM_PACKAGES;

export function isSlotformPackage(name: string): name is SlotformPackage {
	return Object.hasOwn(SLOTFORM_PACKAGES, name);
}

// The given packages and every first-party package their `dependencies`
// reach, sorted by name.
export function slotformClosure(
	names: Iterable<SlotformPackage>,
): SlotformPackage[] {
	const seen = new Set<SlotformPackage>();
	const visit = (name: SlotformPackage): void => {
		if (seen.has(name)) return;
		seen.add(name);
		for (const dep of SLOTFORM_PACKAGES[name].dependencies) visit(dep);
	};
	for (const name of names) visit(name);
	return [...seen].sort();
}

// A package's spec, the caret of the one version every Slotform package is
// published at: docs/architecture/releasing.md, "The version rule".
export function slotformSpec(): string {
	return `^${cliManifest.version}`;
}

// Each first-party plugin's package, by plugin name, with its spec.
export function slotformPluginSpecs(
	plugins: Iterable<string>,
): Record<string, string> {
	const specs: Record<string, string> = {};
	for (const name of plugins) {
		const pkgName = pluginPackage(name);
		if (isSlotformPackage(pkgName)) specs[pkgName] = slotformSpec();
	}
	return specs;
}
