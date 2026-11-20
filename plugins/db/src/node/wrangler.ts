import { GENERATED_DIR } from "@slotform/cli";
import { LOCAL_PERSIST } from "@slotform/cloudflare";
import { runCommand } from "./exec.ts";

// One --config and --persist-to for every local wrangler invocation: docs/architecture/plugins/cloudflare.md, "Local state".
const WRANGLER_CONFIG = `${GENERATED_DIR}/wrangler.toml`;

// The table `wrangler d1 migrations apply` records applied migrations in;
// the generated wrangler config sets no `migrations_table`, so it is the default.
export const MIGRATIONS_TABLE = "d1_migrations";

// Flags that target the local miniflare-backed D1 that `wrangler dev` reads:
// the dev state, or the `persist` directory of a `slotform screens serve` run.
function localD1Flags(persist = LOCAL_PERSIST): string[] {
	return ["--local", "--persist-to", persist, "--config", WRANGLER_CONFIG];
}

// Flags that target the deployed remote D1.
function remoteD1Flags(): string[] {
	return ["--remote", "--config", WRANGLER_CONFIG];
}

export function migrationsApply(
	cwd: string,
	databaseName: string,
	target: "local" | "remote",
	env: NodeJS.ProcessEnv,
	persist?: string,
): void {
	const flags = target === "local" ? localD1Flags(persist) : remoteD1Flags();
	runCommand(
		"npx",
		["wrangler", "d1", "migrations", "apply", databaseName, ...flags],
		cwd,
		env,
	);
}

export function executeSql(
	cwd: string,
	databaseName: string,
	target: "local" | "remote",
	command: string,
	env: NodeJS.ProcessEnv,
): void {
	const flags = target === "local" ? localD1Flags() : remoteD1Flags();
	runCommand(
		"npx",
		["wrangler", "d1", "execute", databaseName, ...flags, "--command", command],
		cwd,
		env,
	);
}

export function executeSqlFile(
	cwd: string,
	databaseName: string,
	target: "local" | "remote",
	file: string,
	env: NodeJS.ProcessEnv,
	persist?: string,
): void {
	const flags = target === "local" ? localD1Flags(persist) : remoteD1Flags();
	runCommand(
		"npx",
		["wrangler", "d1", "execute", databaseName, ...flags, "--file", file],
		cwd,
		env,
	);
}
