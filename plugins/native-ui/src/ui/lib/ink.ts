import type { ContentTone } from "@fcalell/ui-core/variants";
import { createContext, useContext } from "react";
import { useTokenColor } from "./theme";

// The ink of the place a glyph or a spinner sits in: docs/architecture/plugins/native-ui.md, "Ink".
export const Ink = createContext<ContentTone | undefined>(undefined);

export function useInk(): ContentTone | undefined {
	return useContext(Ink);
}

// The ink of the place as a color, meta where no place sets one.
export function useInkColor(): string | undefined {
	return useTokenColor(`--color-${useInk() ?? "ink-meta"}`);
}
