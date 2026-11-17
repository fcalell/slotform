// Better Auth's organization-plugin tables (`organization` / `member` / `invitation`), as Drizzle SQLite tables.
// Schema tables: docs/architecture/plugins/auth.md, "Schema tables".

// Drizzle types the emitted declarations spell, named through plugin-db: docs/architecture/plugins/auth.md, "Schema tables".
// biome-ignore lint/correctness/noUnusedImports: read by the declaration emit
import type {
	Many,
	One,
	Relations,
	SQLiteTableWithColumns,
} from "@fcalell/plugin-db/orm";
import {
	index,
	integer,
	relations,
	sql,
	sqliteTable,
	text,
} from "@fcalell/plugin-db/orm";
import { user } from "./index.ts";

export const organization = sqliteTable("organization", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	logo: text("logo"),
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	// JSON-encoded consumer metadata; better-auth reads/writes it as a string.
	metadata: text("metadata"),
});

export const member = sqliteTable(
	"member",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id),
		userId: text("user_id")
			.notNull()
			.references(() => user.id),
		role: text("role").notNull().default("member"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		index("member_organizationId_idx").on(table.organizationId),
		index("member_userId_idx").on(table.userId),
	],
);

export const invitation = sqliteTable(
	"invitation",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id),
		email: text("email").notNull(),
		role: text("role"),
		status: text("status").notNull().default("pending"),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		inviterId: text("inviter_id")
			.notNull()
			.references(() => user.id),
	},
	(table) => [
		index("invitation_organizationId_idx").on(table.organizationId),
		index("invitation_email_idx").on(table.email),
	],
);

export const organizationRelations = relations(organization, ({ many }) => ({
	members: many(member),
	invitations: many(invitation),
}));

export const memberRelations = relations(member, ({ one }) => ({
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id],
	}),
	user: one(user, {
		fields: [member.userId],
		references: [user.id],
	}),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
	organization: one(organization, {
		fields: [invitation.organizationId],
		references: [organization.id],
	}),
	inviter: one(user, {
		fields: [invitation.inviterId],
		references: [user.id],
	}),
}));
