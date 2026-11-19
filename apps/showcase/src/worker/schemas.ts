import { z } from "@fcalell/plugin-api/schema";
import { TONES } from "@fcalell/ui-core/tokens";

// A status mark's state.
export const status = z.enum(TONES);

// A region a workspace deploys to, by its code.
export const region = z.enum(["fra", "iad", "sin"]);
