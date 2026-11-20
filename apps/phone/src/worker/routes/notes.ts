import { procedure } from "virtual:slotform-procedure";
import { ApiError } from "@slotform/api/error";
import { z } from "@slotform/api/schema";
import { desc, eq } from "@slotform/db/orm";
import { notes as table } from "../../schema/index.ts";

export const notes = {
	list: procedure({ reads: ["notes"] }).query(({ context }) =>
		context.db.select().from(table).orderBy(desc(table.createdAt)),
	),

	create: procedure({ writes: ["notes"] })
		.input(z.object({ title: z.string().trim().min(1) }))
		.mutation(async ({ input, context }) => {
			const [note] = await context.db
				.insert(table)
				.values({
					id: crypto.randomUUID(),
					title: input.title,
					createdAt: new Date(),
				})
				.returning();
			return note;
		}),

	remove: procedure({ writes: ["notes"] })
		.input(z.object({ id: z.string() }))
		.mutation(async ({ input, context }) => {
			const [note] = await context.db
				.delete(table)
				.where(eq(table.id, input.id))
				.returning();
			if (!note) throw new ApiError("NOT_FOUND");
			return note;
		}),
};
