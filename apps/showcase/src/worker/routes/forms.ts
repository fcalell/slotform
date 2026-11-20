import { procedure } from "virtual:slotform-procedure";
import { z } from "@slotform/api/schema";

// `submit`: the input the Form scenes derive every control from, a line of
// text, a mono line, a numeric line, a date, a switch, a pick of one, a pick of
// several and a prose area, each required or optional.
export const forms = {
	submit: procedure({ writes: ["forms"] })
		.input(
			z.object({
				workspaceId: z.string(),
				title: z.string().min(1),
				why: z.string().optional(),
				kind: z.enum(["change", "measurement", "question"]),
				priority: z.enum(["low", "normal", "high"]).optional(),
				density: z.enum(["compact", "full"]).default("compact"),
				seats: z.number().int(),
				budget: z.number().optional(),
				due: z.date().optional(),
				urgent: z.boolean(),
				notify: z.boolean().optional(),
				channels: z.array(z.enum(["email", "slack", "sms"])).optional(),
				owner: z.string().optional(),
				directory: z.string().optional(),
			}),
		)
		.mutation(() => ({ id: "request-1" })),

	// One required line of text: a name, a note, a rule, the source of a page.
	rename: procedure({ writes: ["forms"] })
		.input(z.object({ workspaceId: z.string(), name: z.string().min(1) }))
		.mutation(() => ({ id: "workspace-1" })),
};
