// The device credentials' table (`apikey`), as a Drizzle SQLite table.
// Schema tables: docs/architecture/plugins/auth.md, "Schema tables".

// Drizzle types the emitted declarations spell, named through plugin-db: docs/architecture/plugins/db.md, "Type resolution".
// biome-ignore lint/correctness/noUnusedImports: read by the declaration emit
import type {
	One,
	Relations,
	SQLiteTableWithColumns,
} from "@fcalell/plugin-db/orm";
import {
	index,
	integer,
	relations,
	sqliteTable,
	text,
} from "@fcalell/plugin-db/orm";
import { user } from "./index.ts";

export const apikey = sqliteTable(
	"apikey",
	{
		id: text("id").primaryKey(),
		configId: text("config_id").default("default").notNull(),
		name: text("name"),
		// The first characters of the key, kept so a list can tell keys apart.
		start: text("start"),
		referenceId: text("reference_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		prefix: text("prefix"),
		// The key's SHA-256, never the key.
		key: text("key").notNull(),
		refillInterval: integer("refill_interval"),
		refillAmount: integer("refill_amount"),
		lastRefillAt: integer("last_refill_at", { mode: "timestamp_ms" }),
		enabled: integer("enabled", { mode: "boolean" }).default(true),
		rateLimitEnabled: integer("rate_limit_enabled", {
			mode: "boolean",
		}).default(true),
		rateLimitTimeWindow: integer("rate_limit_time_window"),
		rateLimitMax: integer("rate_limit_max"),
		requestCount: integer("request_count").default(0),
		remaining: integer("remaining"),
		lastRequest: integer("last_request", { mode: "timestamp_ms" }),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
		permissions: text("permissions"),
		metadata: text("metadata"),
	},
	(table) => [
		index("apikey_configId_idx").on(table.configId),
		index("apikey_referenceId_idx").on(table.referenceId),
		index("apikey_key_idx").on(table.key),
	],
);

export const apikeyRelations = relations(apikey, ({ one }) => ({
	user: one(user, {
		fields: [apikey.referenceId],
		references: [user.id],
	}),
}));
