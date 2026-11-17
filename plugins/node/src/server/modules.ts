import { readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isListedModule } from "../listed.ts";

/**
 * The modules of a directory, by file name without the extension.
 * The URL is written in the call because `stack build` reads it: docs/architecture/plugins/node.md, "Services".
 */
export async function loadModules(
	directory: URL,
): Promise<Record<string, Record<string, unknown>>> {
	const dir = fileURLToPath(directory);
	const names = readdirSync(dir).filter(isListedModule).sort();
	const out: Record<string, Record<string, unknown>> = {};
	for (const file of names) {
		out[file.replace(/\.m?ts$/, "")] = await import(
			pathToFileURL(`${dir}${dir.endsWith("/") ? "" : "/"}${file}`).href
		);
	}
	return out;
}
