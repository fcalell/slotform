import { LOCAL_PERSIST } from "@fcalell/plugin-cloudflare";
import { runCommand } from "./exec.ts";

// One --config and --persist-to for every local wrangler invocation: docs/architecture/plugins/cloudflare.md, "Local state".
const WRANGLER_CONFIG = ".stack/wrangler.toml";

// The table `wrangler d1 migrations apply` records applied migrations in;
// the generated wrangler config sets no `migrations_table`, so it is the default.
export const MIGRATIONS_TABLE = "d1_migrations";

// Flags that target the local miniflare-backed D1 that `wrangler dev` reads:
// the dev state, or the `persist` directory of a `stack screens serve` run.
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
	persist?: string,
): void {
	const flags = target === "local" ? localD1Flags(persist) : remoteD1Flags();
	runCommand(
		"npx",
		["wrangler", "d1", "migrations", "apply", databaseName, ...flags],
		cwd,
	);
}

export function executeSql(
	cwd: string,
	databaseName: string,
	target: "local" | "remote",
	command: string,
): void {
	const flags = target === "local" ? localD1Flags() : remoteD1Flags();
	runCommand(
		"npx",
		["wrangler", "d1", "execute", databaseName, ...flags, "--command", command],
		cwd,
	);
}

export function executeSqlFile(
	cwd: string,
	databaseName: string,
	target: "local" | "remote",
	file: string,
	persist?: string,
): void {
	const flags = target === "local" ? localD1Flags(persist) : remoteD1Flags();
	runCommand(
		"npx",
		["wrangler", "d1", "execute", databaseName, ...flags, "--file", file],
		cwd,
	);
}
