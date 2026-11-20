import { aim, landed } from "./aim.ts";
import { checksAt, hiddenHeight, READ_BUSY, settled } from "./page.ts";

// The page code `slotform screens shoot` and `drive` inject once per tab (bundled
// by `src/node/judge.ts`): the same functions the test run's checks call.
// `globalThis` declares no `__slotformScreens`; `judge.ts` reads it by name.
(globalThis as { __slotformScreens?: unknown }).__slotformScreens = {
	READ_BUSY,
	aim,
	landed,
	checksAt,
	hiddenHeight,
	settled,
};
