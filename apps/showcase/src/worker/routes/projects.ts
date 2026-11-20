import { procedure } from "virtual:slotform-procedure";
import { z } from "@slotform/api/schema";

const project = z.object({
	name: z.string(),
	meta: z.string(),
	// The ISO moment of its last deploy.
	age: z.string(),
});

export const projects = {
	list: procedure({ reads: ["projects"] })
		.input(z.object({ stage: z.enum(["building", "preview", "production"]) }))
		.output(z.array(project))
		.query(() => []),
};
