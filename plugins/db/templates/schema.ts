import { integer, sqliteTable, text } from "@slotform/db/orm";

export const examples = sqliteTable("examples", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
