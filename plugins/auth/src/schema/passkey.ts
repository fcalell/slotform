// The passkey plugin's table (`passkey`), as a Drizzle SQLite table.
// Schema tables: docs/architecture/plugins/auth.md, "Schema tables".

// Drizzle types the emitted declarations spell, named through `@slotform/db`: docs/architecture/plugins/auth.md, "Schema tables".
// biome-ignore lint/correctness/noUnusedImports: read by the declaration emit
import type { One, Relations, SQLiteTableWithColumns } from "@slotform/db/orm";
import { index, integer, relations, sqliteTable, text } from "@slotform/db/orm";
import { user } from "./index.ts";

export const passkey = sqliteTable(
	"passkey",
	{
		id: text("id").primaryKey(),
		name: text("name"),
		publicKey: text("public_key").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		credentialID: text("credential_id").notNull(),
		counter: integer("counter").notNull(),
		deviceType: text("device_type").notNull(),
		backedUp: integer("backed_up", { mode: "boolean" }).notNull(),
		transports: text("transports"),
		createdAt: integer("created_at", { mode: "timestamp_ms" }),
		aaguid: text("aaguid"),
	},
	(table) => [
		index("passkey_userId_idx").on(table.userId),
		index("passkey_credentialID_idx").on(table.credentialID),
	],
);

export const passkeyRelations = relations(passkey, ({ one }) => ({
	user: one(user, {
		fields: [passkey.userId],
		references: [user.id],
	}),
}));
