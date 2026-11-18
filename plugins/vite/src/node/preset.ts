import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

export { excludedImportsPlugin } from "./excluded.ts";

// A virtual module served by the generated file once `stack generate` wrote
// it, by `fallback` before. The path resolves against the working directory,
// the consumer root every `stack` command runs Vite from.
function virtualModule(id: string, file: string, fallback: string): Plugin {
	const resolved = `\0${id}`;
	const path = resolve(file);
	return {
		name: `fcalell:${id.replace("virtual:", "")}`,

		resolveId(source) {
			if (source !== id) return null;
			if (existsSync(path)) return path;
			return resolved;
		},

		load(source) {
			if (source !== resolved) return null;
			return fallback;
		},
	};
}

// `virtual:stack-providers` and its pass-through stub: docs/architecture/plugins/vite.md, "Preset".
export function providersPlugin(): Plugin {
	return virtualModule(
		"virtual:stack-providers",
		".stack/virtual-providers.tsx",
		"export default function Providers(props) {\n\treturn props.children;\n}\n",
	);
}

// `virtual:stack-schema`: docs/architecture/plugins/vite.md, "Preset".
export function schemaPlugin(): Plugin {
	return virtualModule(
		"virtual:stack-schema",
		".stack/schema.ts",
		"export const SCHEMA = {};\n",
	);
}
