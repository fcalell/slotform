import type { ContentTone } from "@fcalell/ui-core/variants";
import { createContext, useContext } from "react";

// The ink of the place a glyph or a spinner sits in: docs/architecture/plugins/native-ui.md, "Ink".
export const Ink = createContext<ContentTone | undefined>(undefined);

export function useInk(): ContentTone | undefined {
	return useContext(Ink);
}
