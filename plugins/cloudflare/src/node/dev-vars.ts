import { SlotformError } from "@slotform/cli/errors";

// The env-name rule: docs/architecture/plugins/cloudflare.md, "Env namespace".
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function assertEnvName(name: string): void {
	if (!ENV_NAME.test(name)) {
		throw new SlotformError(
			`Invalid env var name "${name}": use letters, digits and underscores, not starting with a digit (e.g. AUTH_SECRET).`,
			"INVALID_ENV_NAME",
		);
	}
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whether a `.dev.vars` file already assigns `name` on a line of its own, in
// any form wrangler's dotenv parser reads: `export ` before it, blanks
// around `=`, or `NAME: value`.
export function declaresDevVar(content: string, name: string): boolean {
	return new RegExp(
		`^[ \\t]*(?:export[ \\t]+)?${escapeRegExp(name)}(?:[ \\t]*=|:[ \\t])`,
		"m",
	).test(content);
}
