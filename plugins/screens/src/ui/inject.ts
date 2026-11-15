import { controlPoint, floorsAt, hiddenHeight, READ_BUSY } from "./page.ts";
import { settled } from "./walk.ts";

// The page code `stack screens shoot` and `drive` inject once per tab (bundled
// by `src/node/judge.ts`): the same functions the test run's floors call.
// `globalThis` declares no `__stackScreens`; `judge.ts` reads it by name.
(globalThis as { __stackScreens?: unknown }).__stackScreens = {
	READ_BUSY,
	controlPoint,
	floorsAt,
	hiddenHeight,
	settled,
};
