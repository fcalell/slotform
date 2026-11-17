import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { runCommand } from "./exec.ts";

// Locating drizzle-kit: docs/architecture/plugins/db.md, "drizzle-kit".
function drizzleKitBin(): string {
	let entry: string;
	try {
		entry = createRequire(import.meta.url).resolve("drizzle-kit");
	} catch {
		throw new Error(
			"drizzle-kit is not installed: the db commands run it. Add it to the app's devDependencies (`pnpm add -D drizzle-kit`).",
		);
	}
	return join(dirname(realpathSync(entry)), "bin.cjs");
}

// drizzle-kit's drizzle-orm probe: docs/architecture/plugins/db.md, "drizzle-kit".
function assertDrizzleOrm(bin: string): void {
	try {
		createRequire(bin).resolve("drizzle-orm/version");
	} catch {
		throw new Error(
			`drizzle-orm is not resolvable from drizzle-kit (${dirname(bin)}). Declare drizzle-orm at the project root, or restore pnpm's hoist (node_modules/.pnpm/node_modules), then retry.`,
		);
	}
}

// The sqlite driver probe: docs/architecture/plugins/db.md, "drizzle-kit".
export function assertSqliteDriver(): void {
	const requireFromKit = createRequire(drizzleKitBin());
	try {
		// Constructing a Database is the real probe: the binding loads
		// lazily, so a bare require() passes even with no binary.
		const Database = requireFromKit("better-sqlite3");
		new Database(":memory:").close();
	} catch (err) {
		const detail =
			err instanceof Error ? err.message.split("\n")[0] : String(err);
		throw new Error(
			`better-sqlite3 failed to load from drizzle-kit (${detail}). Build its binding: approve the build (allowBuilds: better-sqlite3: true in pnpm-workspace.yaml) and run \`pnpm rebuild better-sqlite3\`, then retry.`,
		);
	}
}

// Rename prompts always answer create: docs/architecture/plugins/db.md, "drizzle-kit".
const ANSWER_CREATE = `process.stdin.isTTY = true;
process.stdout.isTTY = true;
if (!process.stdin.setRawMode) process.stdin.setRawMode = () => process.stdin;
const on = process.stdin.on;
process.stdin.on = function (event, listener) {
	const result = on.call(this, event, listener);
	if (event === "keypress") {
		setImmediate(() => this.emit("keypress", "\\r", { name: "return", sequence: "\\r" }));
	}
	return result;
};
`;

// Errors reported on exit 0: docs/architecture/plugins/db.md, "drizzle-kit".
const FAILED = /^\s*(?:[A-Za-z]*Error\b|ERROR\b)/m;

// Runs the plugin's drizzle-kit with node, cwd the consumer root:
// drizzle-kit resolves the config's `schema` and `out` against cwd.
// `createOnConflict` answers its rename prompts with "create" (see above);
// `generate` and the drift check set it, `push` does not (its prompts also
// confirm data loss, which only a person answers).
export function runDrizzleKit(
	cwd: string,
	args: string[],
	{ createOnConflict = false }: { createOnConflict?: boolean } = {},
): { stdout: string; stderr: string } {
	const bin = drizzleKitBin();
	assertDrizzleOrm(bin);
	let node = [bin, ...args];
	if (createOnConflict) {
		const preload = join(cwd, ".db-kit", "answer-create.cjs");
		mkdirSync(dirname(preload), { recursive: true });
		writeFileSync(preload, ANSWER_CREATE, "utf-8");
		node = ["--require", preload, ...node];
	}
	const result = runCommand(process.execPath, node, cwd);
	if (FAILED.test(result.stderr) || FAILED.test(result.stdout)) {
		throw new Error(
			`Command failed: drizzle-kit ${args.join(" ")}\n${result.stderr || result.stdout}`,
		);
	}
	return result;
}

interface DrizzleConfig {
	schema: string;
	out?: string;
	dbCredentials?: { url: string };
	tablesFilter?: string[];
}

// The config is a plain object: docs/architecture/plugins/db.md, "drizzle-kit".
export function writeDrizzleConfig(
	configPath: string,
	config: DrizzleConfig,
): void {
	mkdirSync(dirname(configPath), { recursive: true });
	const body = JSON.stringify({ dialect: "sqlite", ...config }, null, "\t");
	writeFileSync(configPath, `export default ${body};\n`, "utf-8");
}
