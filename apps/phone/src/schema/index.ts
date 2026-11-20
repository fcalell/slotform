import { integer, sqliteTable, text } from "@slotform/db/orm";

export * from "@slotform/auth/schema";

export const notes = sqliteTable("notes", {
	id: text("id").primaryKey(),
	title: text("title").notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
