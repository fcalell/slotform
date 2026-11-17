import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

// Pass-through providers stub: docs/architecture/plugins/vite.md, "Preset".
const PROVIDERS_STUB = `export default function Providers(props) {
	return props.children;
}
`;

export { excludedImportsPlugin } from "./excluded.ts";

export interface ProvidersPluginOptions {
	// Path (absolute or relative to `cwd`) to the generated providers module.
	// Defaults to `.stack/virtual-providers.tsx` relative to the Vite config
	// file via its `root` — consumers rarely override this.
	modulePath?: string;
	cwd?: string;
}

export function providersPlugin(opts: ProvidersPluginOptions = {}): Plugin {
	const VIRTUAL_ID = "virtual:stack-providers";
	const RESOLVED_ID = `\0${VIRTUAL_ID}`;
	const cwd = opts.cwd ?? process.cwd();
	const modulePath = opts.modulePath
		? resolve(cwd, opts.modulePath)
		: resolve(cwd, ".stack/virtual-providers.tsx");

	return {
		name: "fcalell:stack-providers",

		resolveId(id) {
			if (id !== VIRTUAL_ID) return null;
			if (existsSync(modulePath)) return modulePath;
			return RESOLVED_ID;
		},

		load(id) {
			if (id !== RESOLVED_ID) return null;
			return PROVIDERS_STUB;
		},
	};
}

export interface SchemaPluginOptions {
	// Path (absolute or relative to `cwd`) to the generated schema module.
	// Defaults to `.stack/schema.ts`.
	modulePath?: string;
	cwd?: string;
}

// `virtual:stack-schema`: docs/architecture/plugins/vite.md, "Preset".
export function schemaPlugin(opts: SchemaPluginOptions = {}): Plugin {
	const VIRTUAL_ID = "virtual:stack-schema";
	const RESOLVED_ID = `\0${VIRTUAL_ID}`;
	const cwd = opts.cwd ?? process.cwd();
	const modulePath = opts.modulePath
		? resolve(cwd, opts.modulePath)
		: resolve(cwd, ".stack/schema.ts");

	return {
		name: "fcalell:stack-schema",

		resolveId(id) {
			if (id !== VIRTUAL_ID) return null;
			if (existsSync(modulePath)) return modulePath;
			return RESOLVED_ID;
		},

		load(id) {
			if (id !== RESOLVED_ID) return null;
			return "export const SCHEMA = {};\n";
		},
	};
}
