import { procedure } from "virtual:slotform-procedure";
import { z } from "@slotform/api/schema";
import { status } from "../schemas.ts";

const step = z.object({
	id: z.string(),
	role: z.enum(["start", "step", "end"]),
	title: z.string(),
	line: z.string(),
	status,
});

const link = z.object({
	id: z.string(),
	from: z.string(),
	to: z.string(),
	label: z.string().optional(),
});

export const flow = {
	graph: procedure({ reads: ["flow"] })
		.output(z.object({ steps: z.array(step), links: z.array(link) }))
		.query(() => ({ steps: [], links: [] })),
};
