// The CLI's own entries; each plugin adds its own through its `gitignore`
// field (`cliSlots.gitignore`), which `stack init` and `stack add` append.
export function gitignoreTemplate(): string {
	return `${["node_modules", "dist", ".stack", ".direnv", ".corepack"].join("\n")}\n`;
}
