import { z } from "@fcalell/plugin-api/schema";
import { TONES } from "@fcalell/ui-core/tokens";

// A status mark's state.
export const status = z.enum(TONES);
