import { createHash, createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { LOCAL_PERSIST } from "@slotform/cloudflare";
import type { ResolvedDbOptions } from "../types.ts";
import {
	assertSqliteDriver,
	runDrizzleKit,
	writeDrizzleConfig,
} from "./drizzle-kit.ts";
import {
	applyFtsLocal,
	existingFtsNames,
	ftsTablesFilter,
	loadFtsDefinitions,
	migratedFts,
	pendingFtsMigrations,
	resyncRecreatedContent,
} from "./fts.ts";
import { DB_KIT_DIR, migrationFiles, migrationsDir } from "./layout.ts";
import { migrationLockPath, withMigrationLock } from "./lock.ts";
import {
	columnsBefore,
	copyOnlyExisting,
	expressionIndexes,
} from "./recreate.ts";
import { executeSql, MIGRATIONS_TABLE, migrationsApply } from "./wrangler.ts";

// The sqlite file a command works on: docs/architecture/plugins/db.md, "Local dev push".
export function sqliteFile(
	cwd: string,
	options: ResolvedDbOptions,
	env: NodeJS.ProcessEnv,
	scratch?: string,
): string {
	const named = scratch ?? env[options.fileVar];
	const file = named ? named : options.path;
	if (!file) {
		throw new Error(
			`No sqlite file: set ${options.fileVar} or the \`path\` option of db()`,
		);
	}
	return resolve(cwd, file);
}

// The local database a command works on, as its log names it.
export function localTarget(
	cwd: string,
	options: ResolvedDbOptions,
	env: NodeJS.ProcessEnv,
): string {
	return options.dialect === "sqlite"
		? sqliteFile(cwd, options, env)
		: "the local D1";
}

// drizzle-kit neither creates the file's directory nor fails without it
// (a push into a missing `./data` reports success and writes nothing), so
// the directory is made first.
function sqliteLocalUrl(
	cwd: string,
	options: ResolvedDbOptions,
	env: NodeJS.ProcessEnv,
	scratch?: string,
): string {
	const url = sqliteFile(cwd, options, env, scratch);
	mkdirSync(dirname(url), { recursive: true });
	return url;
}

// The miniflare D1 filename, derived exactly: docs/architecture/plugins/cloudflare.md, "Local state".
const MINIFLARE_D1_DIR = `${LOCAL_PERSIST}/v3/d1/miniflare-D1DatabaseObject`;

function miniflareD1Path(cwd: string, databaseId: string): string {
	const key = createHash("sha256")
		.update("miniflare-D1DatabaseObject")
		.digest();
	const nameHmac = createHmac("sha256", key)
		.update(databaseId)
		.digest()
		.subarray(0, 16);
	const hmac = createHmac("sha256", key)
		.update(nameHmac)
		.digest()
		.subarray(0, 16);
	const id = Buffer.concat([nameHmac, hmac]).toString("hex");
	return join(cwd, MINIFLARE_D1_DIR, `${id}.sqlite`);
}

// The sqlite file the running `wrangler dev` worker reads. Miniflare creates
// it lazily, so a fresh project materializes it with a no-op query first.
function ensureMiniflareD1(
	cwd: string,
	databaseId: string,
	env: NodeJS.ProcessEnv,
): string {
	const path = miniflareD1Path(cwd, databaseId);
	if (existsSync(path)) return path;
	executeSql(cwd, databaseId, "local", "SELECT 1", env);
	if (!existsSync(path)) {
		throw new Error(
			"Could not materialize the local D1 database. Run `slotform dev` once, then retry.",
		);
	}
	return path;
}

export async function pushSchemaLocal(
	cwd: string,
	options: ResolvedDbOptions,
	env: NodeJS.ProcessEnv,
): Promise<void> {
	assertSqliteDriver();
	// `drizzle-kit push` writes to the dev SQLite file; the lock serializes it
	// across processes, so SQLite's per-file lock does not surface as "database
	// is locked" when `slotform db push` runs while `slotform dev`'s schema watcher fires.
	return withMigrationLock(migrationLockPath(cwd), async () => {
		const configDir = join(cwd, DB_KIT_DIR);
		mkdirSync(configDir, { recursive: true });

		// Push targets the miniflare D1 that wrangler dev reads: docs/architecture/plugins/cloudflare.md, "Local state".
		// The local database is disposable (`slotform db reset`).
		const dbUrl =
			options.dialect === "d1"
				? ensureMiniflareD1(cwd, options.databaseId ?? "", env)
				: sqliteLocalUrl(cwd, options, env);

		const configPath = join(configDir, "drizzle.config.ts");
		// Full-text tables stay out of push's view: docs/architecture/plugins/db.md, "Local dev push".
		const fts = loadFtsDefinitions(cwd, env);
		const ftsNames = new Set([
			...fts.map((d) => d.name),
			...(await existingFtsNames(resolve(cwd, dbUrl))),
		]);
		// Wrangler's migrations table stays out of push's view: docs/architecture/plugins/db.md, "Local dev push".
		writeDrizzleConfig(configPath, {
			schema: "./src/schema/index.ts",
			dbCredentials: { url: dbUrl },
			tablesFilter: [`!${MIGRATIONS_TABLE}`, ...ftsTablesFilter([...ftsNames])],
		});

		runDrizzleKit(cwd, ["push", "--config", configPath], env);
		await applyFtsLocal(cwd, dbUrl, fts);
	});
}

// `custom` writes an empty migration for hand-written SQL (drizzle-kit's
// `--custom`) in place of the schema diff, named `name`.
export async function generateMigrations(
	cwd: string,
	options: ResolvedDbOptions,
	env: NodeJS.ProcessEnv,
	{ custom = false, name }: { custom?: boolean; name?: string } = {},
): Promise<Array<{ name: string; sql: string }>> {
	// The new migrations are the files the directory gains across the run, so
	// the listing, drizzle-kit generate and the second listing hold the lock
	// together: no other migration writer adds a file in between.
	return withMigrationLock(migrationLockPath(cwd), async () => {
		const dir = migrationsDir(cwd, options);
		const existing = new Set(migrationFiles(dir));

		const configDir = join(cwd, DB_KIT_DIR);
		mkdirSync(configDir, { recursive: true });

		const configPath = join(configDir, "drizzle-generate.config.ts");
		writeDrizzleConfig(configPath, {
			schema: "./src/schema/index.ts",
			out: options.migrations,
		});

		const kit = ["generate", "--config", configPath];
		const newSql = (): string[] =>
			migrationFiles(dir).filter((f) => !existing.has(f));

		if (custom) {
			runDrizzleKit(
				cwd,
				[...kit, "--custom", ...(name ? ["--name", name] : [])],
				env,
				{ createOnConflict: true },
			);
			return newSql().map((entry) => ({
				name: entry,
				sql: readFileSync(join(dir, entry), "utf-8"),
			}));
		}

		const before = columnsBefore(dir);
		runDrizzleKit(cwd, kit, env, { createOnConflict: true });

		// Full-text indexes are not in drizzle's snapshot, so they migrate as
		// custom migrations of their own, after the tables they read.
		const fts = loadFtsDefinitions(cwd, env);
		const after = columnsBefore(dir);
		for (const entry of newSql()) {
			const file = join(dir, entry);
			const sql = readFileSync(file, "utf-8");
			const synced = resyncRecreatedContent(
				expressionIndexes(copyOnlyExisting(sql, before), after),
				fts,
			);
			if (synced !== sql) writeFileSync(file, synced, "utf-8");
		}
		for (const pending of pendingFtsMigrations(fts, migratedFts(dir))) {
			const before = new Set(newSql());
			runDrizzleKit(cwd, [...kit, "--custom", "--name", pending.name], env, {
				createOnConflict: true,
			});
			const [created] = newSql().filter((f) => !before.has(f));
			if (!created)
				throw new Error(`Could not write migration ${pending.name}`);
			writeFileSync(join(dir, created), pending.sql, "utf-8");
		}

		return newSql().map((entry) => ({
			name: entry,
			sql: readFileSync(join(dir, entry), "utf-8"),
		}));
	});
}

export async function applyMigrationsRemote(
	cwd: string,
	options: ResolvedDbOptions,
	env: NodeJS.ProcessEnv,
): Promise<void> {
	if (options.dialect === "sqlite") {
		throw new Error("Remote migrations not supported for sqlite dialect");
	}

	const databaseName = options.databaseId;
	if (!databaseName) {
		throw new Error("Cannot apply remote migrations: no databaseId configured");
	}

	// Wrangler reads every file under `migrations_dir` to compute the
	// pending list. Hold the lock so a concurrent `generateMigrations` can't
	// write a half-flushed file into the dir while wrangler is enumerating.
	return withMigrationLock(migrationLockPath(cwd), async () => {
		migrationsApply(cwd, databaseName, "remote", env);
	});
}

// `scratch` is a screens-serve run's database: docs/architecture/plugins/db.md, "Seed".
export async function applyMigrationsLocal(
	cwd: string,
	options: ResolvedDbOptions,
	env: NodeJS.ProcessEnv,
	scratch?: string,
): Promise<void> {
	// Both branches read the migrations dir; the sqlite branch additionally
	// writes journal entries against the local DB. Serialize against any
	// other migration-writing path under the same lock.
	return withMigrationLock(migrationLockPath(cwd), async () => {
		if (options.dialect === "sqlite") {
			assertSqliteDriver();
			const configDir = join(cwd, DB_KIT_DIR);
			mkdirSync(configDir, { recursive: true });

			const configPath = join(configDir, "drizzle-migrate.config.ts");
			writeDrizzleConfig(configPath, {
				schema: "./src/schema/index.ts",
				out: options.migrations,
				dbCredentials: { url: sqliteLocalUrl(cwd, options, env, scratch) },
			});

			runDrizzleKit(cwd, ["migrate", "--config", configPath], env);
			return;
		}

		const databaseName = options.databaseId;
		if (!databaseName) {
			throw new Error(
				"Cannot apply local migrations: no databaseId configured",
			);
		}

		// Local migrations share wrangler's --config and --persist-to: docs/architecture/plugins/cloudflare.md, "Local state".
		migrationsApply(cwd, databaseName, "local", env, scratch);
	});
}
