import { procedure } from "virtual:stack-procedure";
import { z } from "@fcalell/plugin-api/schema";

// A day's figure, its parts by project when the chart stacks.
const day = z.object({
	day: z.string(),
	value: z.number(),
	parts: z.record(z.string(), z.number()).optional(),
	at: z.string().optional(),
});

const meter = z.object({
	label: z.string(),
	value: z.number(),
	max: z.number(),
	meta: z.string(),
});

// What moving to another plan changes, a fact a row.
const planFact = z.object({
	label: z.string(),
	values: z.tuple([z.string(), z.string()]),
});

export const usage = {
	// The billing month: its meters and the day they reset.
	month: procedure({ reads: ["usage"] })
		.output(z.object({ resets: z.string(), meters: z.array(meter) }))
		.query(() => ({ resets: "", meters: [] })),

	requests: procedure({ reads: ["usage"] })
		.output(z.array(day))
		.query(() => []),

	minutes: procedure({ reads: ["usage"] })
		.output(z.array(day))
		.query(() => []),

	cron: procedure({ reads: ["usage"] })
		.output(z.array(day))
		.query(() => []),

	// What moving to Business changes; `billed` is the price now and after (with from when), the last row the screen draws.
	plan: procedure({ reads: ["usage"] })
		.output(z.object({ billed: planFact, facts: z.array(planFact) }))
		.query(() => ({
			billed: { label: "Billed", values: ["", ""] },
			facts: [],
		})),

	upgrade: procedure({ writes: ["usage"] }).mutation(() => undefined),
};
