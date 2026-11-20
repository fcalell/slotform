import { MissingPluginError } from "./errors.ts";

// First-party plugins, for pickers before any config exists: docs/architecture/plugin-authoring.md, "Plugin discovery".
export const PLUGIN_NAMES = [
	"cloudflare",
	"db",
	"auth",
	"api",
	"query",
	"node",
	"vite",
	"react",
	"react-ui",
	"expo",
	"native-ui",
	"screens",
] as const;

// A first-party plugin's npm name.
export function pluginPackage(name: string): string {
	return `@slotform/${name}`;
}

export function assertKnownPlugins(names: readonly string[]): void {
	const known = new Set<string>(PLUGIN_NAMES);
	const unknown = names.filter((n) => !known.has(n));
	if (unknown.length > 0) {
		throw new MissingPluginError(
			unknown.join(", "),
			`Unknown plugin(s): ${unknown.join(", ")}. Available: ${PLUGIN_NAMES.join(", ")}`,
		);
	}
}
