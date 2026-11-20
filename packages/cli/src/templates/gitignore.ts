import { GENERATED_DIR } from "../lib/generated-dir.ts";

// The CLI's own entries; each plugin adds its own through its `gitignore`
// field (`cliSlots.gitignore`), which `slotform init` and `slotform add` append.
export function gitignoreTemplate(): string {
	return `${["node_modules", "dist", GENERATED_DIR, ".direnv", ".corepack"].join("\n")}\n`;
}
