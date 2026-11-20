import { readFile } from "node:fs/promises";
import { basename, join, posix } from "node:path";
import type { PluginRuntimeEntry } from "@slotform/api";
import { api } from "@slotform/api";
import { type ContributionCtx, plugin, slot } from "@slotform/cli";
import type { TsExpression, TsImportSpec } from "@slotform/cli/ast";
import { cliSlots } from "@slotform/cli/cli-slots";
import { SlotformError } from "@slotform/cli/errors";
import { cloudflare, LOCAL_PERSIST } from "@slotform/cloudflare";
import { node } from "@slotform/node";
import { screens } from "@slotform/screens";
import { coalesce } from "./node/coalesce.ts";
import {
	assertDeployableDatabaseId,
	createD1Database,
	D1_PLACEHOLDER_ID,
} from "./node/d1.ts";
import { extractSchemaEntities } from "./node/entities.ts";
import { DB_KIT_DIR, migrationFiles, migrationsDir } from "./node/layout.ts";
import { migrationLockPath, withMigrationLock } from "./node/lock.ts";
import { MIGRATION_CHECKS } from "./node/migration-safety.ts";
import {
	applyMigrationsLocal,
	applyMigrationsRemote,
	generateMigrations,
	localTarget,
	pushSchemaLocal,
} from "./node/push.ts";
import { applySeed, describeSeed, loadSeed } from "./node/seed.ts";
import { dbOptionsSchema } from "./types.ts";

// The schema import, file form: docs/architecture/plugins/db.md, "Schema import".
const SCHEMA_IMPORT: TsImportSpec = {
	source: "../src/schema/index.ts",
	namespace: "schema",
};

// The modules whose tables the scaffolded schema re-exports: a plugin that
// owns tables contributes its schema subpath, so they migrate with the app's.
const schemaModules = slot.list<string>({
	source: "db",
	name: "schemaModules",
});

// The template's first blank line ends its import block; the re-exports
// stand there, as `guide/schema.md` shows them.
function withReexports(template: string, modules: string[]): string {
	if (modules.length === 0) return template;
	const end = template.indexOf("\n\n");
	const lines = modules.map((m) => `export * from "${m}";`).join("\n");
	return `${template.slice(0, end)}\n\n${lines}${template.slice(end)}`;
}

// What the CLI hands an init prompt: `select` and `text` of its prompt API.
interface InitPromptCtx {
	prompt: {
		select: <T>(
			msg: string,
			options: { label: string; value: T }[],
		) => Promise<T>;
		text: (msg: string, opts?: { default?: string }) => Promise<string>;
	};
}

const d1Only = (command: string): string =>
	`\`slotform db ${command}\` only applies to the d1 dialect.`;

export const db = plugin("db", {
	label: "Database",

	schema: dbOptionsSchema,

	requires: ["api"],

	// The migrations tool: an optional peer of the plugin, so an install that only
	// runs the app holds none of it (and none of its esbuilds).
	devDependencies: {
		"drizzle-kit": "^0.31.11",
	},
	gitignore: [DB_KIT_DIR],

	guide: [
		{
			page: "change-a-table",
			trigger: "Adding a table or changing a column",
		},
		{
			page: "destructive-change",
			trigger: "Dropping or renaming a table, a column or a view",
		},
		{
			page: "schema",
			trigger:
				"Writing `src/schema/index.ts`, importing any Drizzle piece, or querying through `context.db`",
		},
		{
			page: "fts",
			trigger:
				"Searching text: a search box, a `match` query, or declaring a full-text index",
		},
		{
			page: "seed",
			trigger:
				"Writing `src/schema/seed.ts`, the rows every database starts with",
		},
		{
			page: "commands",
			trigger:
				"Running a `slotform db` command, or a migration, a local database or a deploy step misbehaves",
		},
		{
			page: "migration-safety",
			trigger:
				"`slotform db check` or a deploy refuses a migration (drift or a drop)",
		},
		{
			page: "config",
			trigger:
				"Setting `db()` options, picking the d1 or sqlite dialect, or creating the D1 database",
		},
	],

	slots: {
		schemaModules,
	},

	commands: {
		push: {
			description: "Push schema to local database",
			handler: async (ctx) => {
				ctx.log.info(
					`Pushing schema to ${localTarget(ctx.cwd, ctx.options, ctx.env)}...`,
				);
				await pushSchemaLocal(ctx.cwd, ctx.options, ctx.env);
				ctx.log.success("Schema pushed");
			},
		},
		generate: {
			description: "Generate migration files from schema diff",
			options: {
				custom: {
					type: "boolean" as const,
					description:
						"Write an empty migration for hand-written SQL instead of a schema diff",
					default: false,
				},
				name: {
					type: "string" as const,
					description: "The migration's name (with --custom)",
				},
			},
			handler: async (ctx, flags) => {
				const custom = Boolean(flags.custom);
				const name = typeof flags.name === "string" ? flags.name : undefined;
				if (name && !custom) {
					ctx.log.error("`--name` applies to `--custom` only.");
					return;
				}
				const migrations = await generateMigrations(
					ctx.cwd,
					ctx.options,
					ctx.env,
					{
						custom,
						name,
					},
				);
				if (migrations.length === 0) {
					ctx.log.info("No schema changes detected");
					return;
				}
				for (const m of migrations) {
					ctx.log.info(`Created ${m.name}`);
				}
				ctx.log.success(`Generated ${migrations.length} migration(s)`);
			},
		},
		apply: {
			description: "Apply pending migrations",
			options: {
				remote: {
					type: "boolean" as const,
					description: "Apply to remote D1",
					default: false,
				},
			},
			handler: async (ctx, flags) => {
				if (flags.remote) {
					await applyMigrationsRemote(ctx.cwd, ctx.options, ctx.env);
				} else {
					ctx.log.info(
						`Applying migrations to ${localTarget(ctx.cwd, ctx.options, ctx.env)}...`,
					);
					await applyMigrationsLocal(ctx.cwd, ctx.options, ctx.env);
				}
				ctx.log.success("Migrations applied");
			},
		},
		reset: {
			description: "Reset local database (all data will be lost)",
			handler: async (ctx) => {
				if (ctx.options.dialect !== "d1") {
					ctx.log.error(d1Only("reset"));
					return;
				}
				if (process.stdin.isTTY) {
					const ok = await ctx.prompt.confirm(
						"Reset local database? All data will be lost.",
					);
					if (!ok) return;
				}
				// Wipes the local worker state, the local D1 with it. Hold the
				// lock while we tear down so a concurrent push/generate doesn't
				// write into a half-deleted directory.
				await withMigrationLock(migrationLockPath(ctx.cwd), async () => {
					const { rmSync } = await import("node:fs");
					rmSync(join(ctx.cwd, LOCAL_PERSIST), {
						recursive: true,
						force: true,
					});
				});
				ctx.log.success(
					"Local database deleted. Run `slotform dev` to recreate.",
				);
			},
		},
		create: {
			description: "Create a Cloudflare D1 database and print its id",
			options: {
				name: {
					type: "string" as const,
					description: "Database name (default: the project directory name)",
				},
			},
			handler: async (ctx, flags) => {
				if (ctx.options.dialect !== "d1") {
					ctx.log.error(d1Only("create"));
					return;
				}
				const name =
					typeof flags.name === "string" ? flags.name : basename(ctx.cwd);
				ctx.log.info(`Creating D1 database "${name}"...`);
				const result = createD1Database(name, ctx.env);
				if (!result.ok) {
					ctx.log.error(result.error);
					return;
				}
				ctx.log.success(`Created D1 database "${result.name}"`);
				ctx.log.info(
					`Set it in slotform.config.ts: db({ dialect: "d1", databaseId: "${result.id}" })`,
				);
			},
		},
		check: {
			description: "Check migrations for schema drift and destructive changes",
			handler: async (ctx) => {
				const problems: string[] = [];
				for (const check of MIGRATION_CHECKS) {
					const problem = check.run(ctx.cwd, ctx.options, ctx.env);
					if (problem) {
						ctx.log.error(problem);
						problems.push(check.problem);
					} else {
						ctx.log.success(check.pass);
					}
				}
				if (problems.length > 0) {
					throw new SlotformError(
						`db check failed: ${problems.join(", ")}`,
						"DB_CHECK",
					);
				}
			},
		},
		seed: {
			description: "Seed the database from src/schema/seed.ts",
			options: {
				remote: {
					type: "boolean" as const,
					description: "Seed the remote (deployed) database",
					default: false,
				},
			},
			handler: async (ctx, flags) => {
				const remote = Boolean(flags.remote);
				const seeded = await applySeed(ctx.cwd, ctx.options, ctx.env, {
					remote,
				});
				if (seeded) {
					ctx.log.success(`Seeded${remote ? " remote database" : ""}`);
				} else {
					ctx.log.info("No src/schema/seed.ts found — nothing to seed.");
				}
			},
		},
	},

	contributes: (self) => {
		// One coalescing latch per cwd, scoped to the graph: docs/architecture/plugins/db.md, "Local dev push".
		const schemaPushes = new Map<string, () => Promise<void>>();
		const schemaPush = ({
			cwd,
			env,
		}: ContributionCtx): (() => Promise<void>) => {
			let push = schemaPushes.get(cwd);
			if (!push) {
				push = coalesce(() => pushSchemaLocal(cwd, self.options, env));
				schemaPushes.set(cwd, push);
			}
			return push;
		};
		// Read when a slot resolves: the init prompt graph runs contributes over unparsed `{}` options.
		const migrationsPath = () =>
			posix.normalize(self.options.migrations).replace(/\/$/, "");
		const d1 = () => self.options.dialect === "d1";

		return [
			cliSlots.initPrompts.contribute(() => ({
				plugin: "db",
				ask: async (ctx) => {
					// PromptSpec types its ctx as unknown; the CLI passes its prompt API.
					const { prompt } = ctx as InitPromptCtx;
					const dialect = await prompt.select("Database dialect:", [
						{ label: "D1 (Cloudflare)", value: "d1" as const },
						{ label: "SQLite (local)", value: "sqlite" as const },
					]);
					const answers: Record<string, unknown> = { dialect };
					if (dialect === "d1") {
						answers.databaseId = await prompt.text("D1 database ID:", {
							default: D1_PLACEHOLDER_ID,
						});
					} else {
						answers.path = await prompt.text("SQLite file path:", {
							default: "./data/app.sqlite",
						});
					}
					return answers;
				},
			})),

			cliSlots.initScaffolds.contribute(async (ctx) => {
				const template = await readFile(ctx.template("schema.ts"), "utf8");
				const modules = await ctx.resolve(self.slots.schemaModules);
				return {
					content: withReexports(template, modules),
					target: "src/schema/index.ts",
					plugin: "db",
				};
			}),

			// The D1 binding, d1 only, with a required migrationsDir: docs/architecture/plugins/db.md, "Slots and contributions".
			cloudflare.slots.bindings.contribute(() => {
				if (!d1()) return undefined;
				const databaseId = self.options.databaseId;
				if (!databaseId) return undefined;
				return {
					kind: "d1",
					binding: self.options.binding,
					databaseName: databaseId,
					databaseId,
					migrationsDir: self.options.migrations,
				};
			}),

			// The sqlite runtime opens the file its env var names; the
			// configured `path` is that var's dev default.
			api.slots.env.contribute(() => {
				if (self.options.dialect !== "sqlite" || !self.options.path) {
					return undefined;
				}
				return { name: self.options.fileVar, devDefault: self.options.path };
			}),

			// The node bundle (`slotform build`) carries the committed migrations beside
			// it and applies them before it listens, so the box needs no CLI.
			node.slots.bundleEntries.contribute(() => {
				if (self.options.dialect !== "sqlite") return undefined;
				return {
					name: "db-migrate",
					imports: [
						{
							source: "@slotform/db/runtime/sqlite",
							named: ["migrateSqlite"],
						},
					],
					boot: {
						kind: "call",
						callee: { kind: "identifier", name: "migrateSqlite" },
						args: [
							{
								kind: "object",
								properties: [
									{
										key: "fileVar",
										value: { kind: "string", value: self.options.fileVar },
									},
									{
										key: "folder",
										value: {
											kind: "new",
											callee: { kind: "identifier", name: "URL" },
											args: [
												{ kind: "string", value: "./migrations" },
												{
													kind: "member",
													object: { kind: "identifier", name: "import.meta" },
													property: "url",
												},
											],
										},
									},
								],
							},
						],
					},
					copy: [
						{
							from: self.options.migrations,
							to: "migrations",
							// The journal and the statements; drizzle-kit's snapshots only
							// diff the next generate.
							only: (path) =>
								path.endsWith(".sql") || path === "meta/_journal.json",
						},
					],
				};
			}),

			// One runtime module per dialect: docs/architecture/plugins/db.md, "Runtime".
			api.slots.pluginRuntimes.contribute(
				async (ctx): Promise<PluginRuntimeEntry> => {
					const hasSchema = await ctx.fileExists("src/schema");
					const schema: Record<string, TsExpression> = hasSchema
						? { schema: { kind: "identifier", name: "schema" } }
						: {};
					if (self.options.dialect === "sqlite") {
						return {
							plugin: "db",
							import: {
								source: "@slotform/db/runtime/sqlite",
								default: "dbRuntime",
							},
							identifier: "dbRuntime",
							options: {
								fileVar: { kind: "string", value: self.options.fileVar },
								...schema,
							},
						};
					}
					return {
						plugin: "db",
						import: {
							source: "@slotform/db/runtime",
							default: "dbRuntime",
						},
						identifier: "dbRuntime",
						options: {
							binding: {
								kind: "string",
								value: self.options.binding,
							},
							...schema,
						},
					};
				},
			),

			// Schema namespace import — gated on the schema directory existing,
			// same as the runtime entry's `schema` option.
			api.slots.workerImports.contribute(
				async (ctx): Promise<TsImportSpec | undefined> => {
					const hasSchema = await ctx.fileExists("src/schema");
					return hasSchema ? SCHEMA_IMPORT : undefined;
				},
			),

			// The entity vocabulary handoff: docs/architecture/plugins/db.md, "Entity vocabulary".
			api.slots.entities.contribute(async (ctx) => {
				const hasSchema = await ctx.fileExists("src/schema");
				if (!hasSchema) return undefined;
				const names = extractSchemaEntities(ctx.cwd);
				return names ? [...names] : undefined;
			}),

			// The schema push at `slotform dev` Ready time, through the latch the
			// schema watcher below shares.
			cliSlots.devReadySetup.contribute((ctx) => {
				const push = schemaPush(ctx);
				return {
					name: "db-schema-apply",
					run: async () => {
						ctx.log.info("Applying schema to local database...");
						await push();
						ctx.log.success("Schema applied");
					},
				};
			}),

			// Seed at Ready, after the schema push: docs/architecture/plugins/db.md, "Seed".
			cliSlots.devReadySetup.contribute((ctx) => ({
				name: "db-seed",
				run: async () => {
					const seeded = await applySeed(ctx.cwd, self.options, ctx.env, {
						remote: false,
					});
					if (seeded) ctx.log.success("Seed applied");
				},
			})),

			// A schema save re-pushes into the local database the running worker reads.
			cliSlots.devWatchers.contribute((ctx) => {
				const push = schemaPush(ctx);
				return {
					name: "schema",
					paths: "src/schema/**",
					ignore: ["**/seed.ts"],
					debounce: 300,
					handler: async () => {
						ctx.log.info("Schema change detected, re-pushing...");
						await push();
						ctx.log.success("Schema pushed");
					},
				};
			}),

			cliSlots.devWatchers.contribute((ctx) => ({
				name: "seed",
				paths: "src/schema/seed.ts",
				debounce: 300,
				handler: async () => {
					ctx.log.info("Seed change detected, re-seeding...");
					const seeded = await applySeed(ctx.cwd, self.options, ctx.env, {
						remote: false,
					});
					if (seeded) ctx.log.success("Seed applied");
				},
			})),

			// The screens-serve scratch database: docs/architecture/plugins/db.md, "Seed".
			screens.slots.serveSteps.contribute((ctx) => ({
				name: "database",
				run: async (serve) => {
					if (
						migrationFiles(migrationsDir(ctx.cwd, self.options)).length === 0
					) {
						throw new Error(
							"No migrations to build the scratch database from: run `slotform db generate`.",
						);
					}
					let scratch = serve.state;
					if (self.options.dialect === "sqlite") {
						scratch = join(serve.dir, "database.sqlite");
						serve.env[self.options.fileVar] = scratch;
					}
					await applyMigrationsLocal(ctx.cwd, self.options, ctx.env, scratch);
					await applySeed(ctx.cwd, self.options, ctx.env, {
						remote: false,
						scratch,
					});
				},
			})),

			// The deploy contributions, d1 only (each reads the dialect when it resolves): docs/architecture/plugins/db.md, "Deploy checks".
			...[
				cliSlots.deployChecks.contribute(() => {
					if (!d1()) return undefined;
					assertDeployableDatabaseId(self.options.databaseId);
					return undefined;
				}),

				// `slotform db check`'s checks, each refusing the deploy before the
				// build or any migration touches the cloud.
				...MIGRATION_CHECKS.map((check) =>
					cliSlots.deployChecks.contribute((ctx) => {
						if (!d1()) return undefined;
						const problem = check.run(ctx.cwd, self.options, ctx.env);
						if (problem) throw new SlotformError(problem, check.code);
						return undefined;
					}),
				),

				// Lists the committed migrations for the deploy plan; the
				// "Database migrations" step below applies the ones still pending
				// remotely (wrangler's journal decides), so the action does nothing.
				cliSlots.deployChecks.contribute((ctx) => {
					if (!d1()) return undefined;
					const files = migrationFiles(migrationsDir(ctx.cwd, self.options));
					if (files.length === 0) return undefined;
					return {
						plugin: "db",
						description: `${files.length} committed migration(s); pending ones apply before the worker deploys`,
						items: files.map((name) => ({ label: name })),
						action: async () => {},
					};
				}),

				cliSlots.deploySteps.contribute((ctx) =>
					d1()
						? {
								name: "Database migrations",
								phase: "pre",
								run: () =>
									applyMigrationsRemote(ctx.cwd, self.options, ctx.env),
							}
						: undefined,
				),

				// Lists the seeded tables and what the remote seed does to rows
				// outside the seed, so the deploy plan (printed even where no
				// confirm runs) states it. The "Database seed" step owns the run.
				cliSlots.deployChecks.contribute(async (ctx) => {
					if (!d1()) return undefined;
					const seed = await loadSeed(ctx.cwd);
					if (seed === null || seed.specs.length === 0) return undefined;
					return {
						plugin: "db",
						description: seed.prune
							? "Database seed: `prune` is set in src/schema/seed.ts, so the remote database DELETES every row of these tables that is not in the seed"
							: "Database seed upserts these tables and keeps every other row (`export const prune = true` in src/schema/seed.ts deletes them)",
						items: describeSeed(seed.specs, { prune: seed.prune }),
						action: async () => {},
					};
				}),

				// The deploy-time seed: docs/architecture/plugins/db.md, "Seed".
				cliSlots.deploySteps.contribute(async (ctx) => {
					if (!d1() || !(await ctx.fileExists("src/schema/seed.ts")))
						return undefined;
					return {
						name: "Database seed",
						phase: "pre",
						run: async () => {
							await applySeed(ctx.cwd, self.options, ctx.env, {
								remote: true,
							});
						},
					};
				}),
			],

			cliSlots.removeFiles.contribute(() => ["src/schema/", migrationsPath()]),

			// drizzle-kit writes the migrations (snapshots, journal) in its own
			// format: generated, so Biome skips them.
			cliSlots.lintIgnore.contribute(() => migrationsPath()),
		];
	},
});

export type { DbOptions } from "./types.ts";
