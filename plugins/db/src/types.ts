import { z } from "zod";

// `.superRefine` enforces the dialect's required option at parse time, so the
// input type keeps both `databaseId` and `path` optional: `db({ dialect: "d1" })`
// type-checks and fails at the runtime check with the option's name.
export const dbOptionsSchema = z
	.object({
		dialect: z.enum(["d1", "sqlite"]),
		databaseId: z.string().optional(),
		path: z.string().optional(),
		migrations: z.string().default("./src/migrations"),
		binding: z.string().default("DB_MAIN"),
		fileVar: z.string().default("DB_FILE"),
	})
	.superRefine((opts, ctx) => {
		if (opts.dialect === "d1" && !opts.databaseId) {
			ctx.addIssue({
				code: "custom",
				path: ["databaseId"],
				message: "D1 dialect requires databaseId",
			});
		}
		if (opts.dialect === "sqlite" && !opts.path) {
			ctx.addIssue({
				code: "custom",
				path: ["path"],
				message: "SQLite dialect requires path",
			});
		}
	});

export type DbOptions = z.input<typeof dbOptionsSchema>;

// The options with their defaults applied, as every command and contribution receives them.
export type ResolvedDbOptions = z.output<typeof dbOptionsSchema>;
