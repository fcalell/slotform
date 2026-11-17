// The environments a consumer spans: docs/architecture/consumer-project.md, "TypeScript projects".
interface TsconfigLayout {
	// A DOM app built by Vite: `vite` in the config.
	web: boolean;
	native: boolean;
	worker: boolean;
	node: boolean;
}

export function tsconfigLayout(plugins: readonly string[]): TsconfigLayout {
	return {
		web: plugins.includes("vite"),
		native: plugins.includes("expo"),
		worker: plugins.includes("api") || plugins.includes("db"),
		node: plugins.includes("node") && !plugins.includes("cloudflare"),
	};
}

function isSplit(layout: TsconfigLayout): boolean {
	return layout.worker && (layout.native || layout.web);
}

// Whether a project `tsconfigTemplate` writes extends `node-tsx.json`, whose `types` names `node`:
// the worker's under a split, or the single config of an app with no web or native side. The app
// then installs `@types/node`; the server's tests run under Node on either target.
export function extendsNodeTsx(layout: TsconfigLayout): boolean {
	return isSplit(layout) || !(layout.web || layout.native);
}

// The tsconfig that compiles the worker's sources: docs/architecture/consumer-project.md, "TypeScript projects".
export function workerTsconfig(layout: TsconfigLayout): string {
	return isSplit(layout) ? "tsconfig.worker.json" : "tsconfig.json";
}

interface TsconfigOptions extends TsconfigLayout {
	// `cliSlots.tsconfigPaths` entries: docs/architecture/slot-catalog.md, "CLI lifecycle slots (`cliSlots`)".
	procedurePaths: Record<string, string[]>;
	// `cliSlots.tsconfigTypes` entries: docs/architecture/slot-catalog.md, "CLI lifecycle slots (`cliSlots`)".
	nativeTypes: string[];
}

// Returns `[filename, content]` pairs.
// The app and worker projects under a solution config: docs/architecture/consumer-project.md, "TypeScript projects".
// The `virtual:stack-procedure` alias: docs/architecture/runtime.md, "`virtual:stack-procedure`".
export function tsconfigTemplate(
	options: TsconfigOptions,
): Array<[string, string]> {
	if (isSplit(options)) {
		const base = options.native ? nativeApp(options.nativeTypes) : webApp();
		return [
			["tsconfig.json", render(SOLUTION)],
			["tsconfig.app.json", render(appProject(base, options.node))],
			["tsconfig.worker.json", render(workerProject(options))],
		];
	}
	if (options.native) {
		return [["tsconfig.json", render(nativeApp(options.nativeTypes))]];
	}

	const single = {
		extends: options.web
			? "@fcalell/typescript-config/web-vite.json"
			: "@fcalell/typescript-config/node-tsx.json",
		compilerOptions: options.worker
			? { paths: options.procedurePaths }
			: undefined,
		// Only the `.stack/*.d.ts` declarations are type-checked: docs/architecture/consumer-project.md, "TypeScript projects".
		include: ["src", ".stack/*.d.ts"],
	};
	return [["tsconfig.json", render(single)]];
}

const SOLUTION = {
	files: [],
	references: [
		{ path: "./tsconfig.app.json" },
		{ path: "./tsconfig.worker.json" },
	],
};

interface Project {
	extends: string;
	compilerOptions: Record<string, unknown>;
	include: string[];
	exclude?: string[];
	references?: Array<{ path: string }>;
}

// The app project: docs/architecture/consumer-project.md, "TypeScript projects".
function appProject(config: Project, node: boolean): Project {
	return {
		...config,
		compilerOptions: {
			...config.compilerOptions,
			noEmit: true,
			declaration: false,
			declarationMap: false,
			disableSourceOfProjectReferenceRedirect: true,
			tsBuildInfoFile: "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
		},
		exclude: node ? ["src/worker", "src/server"] : ["src/worker"],
		references: [{ path: "./tsconfig.worker.json" }],
	};
}

// The worker project: docs/architecture/consumer-project.md, "TypeScript projects".
function workerProject(options: TsconfigOptions): Project {
	return {
		extends: "@fcalell/typescript-config/node-tsx.json",
		compilerOptions: {
			// The Workers' globals come from `.stack/worker-configuration.d.ts`; the node target keeps
			// the preset's `node`.
			...(options.node ? {} : { types: [] }),
			paths: options.procedurePaths,
			composite: true,
			// `node-tsx` (via base) disables incremental, which composite
			// forbids.
			incremental: true,
			noEmit: false,
			emitDeclarationOnly: true,
			declarationMap: true,
			outDir: "./.stack/types",
			tsBuildInfoFile: "./.stack/types/tsconfig.worker.tsbuildinfo",
		},
		include: [
			"src/worker",
			"src/schema",
			"src/shared",
			".stack/worker.ts",
			".stack/procedure.ts",
			...(options.node ? ["src/server"] : [".stack/worker-configuration.d.ts"]),
		],
	};
}

function webApp(): Project {
	return {
		extends: "@fcalell/typescript-config/web-vite.json",
		compilerOptions: {},
		include: ["src", ".stack/routes.d.ts"],
	};
}

function nativeApp(types: string[]): Project {
	return {
		extends: "expo/tsconfig.base",
		compilerOptions: {
			noEmit: true,
			strict: true,
			noUncheckedIndexedAccess: true,
			jsxImportSource: "react",
			// Contributed global type augmentations: docs/architecture/consumer-project.md, "TypeScript projects".
			types,
		},
		include: [
			"src",
			".stack/entry.tsx",
			".stack/routes.d.ts",
			".stack/expo-env.d.ts",
		],
	};
}

function render(config: unknown): string {
	return `${JSON.stringify(config, null, "\t")}\n`;
}
