import type { ResolvedTheme } from "@slotform/ui-core/derive";
import {
	modeTokens,
	nativeMeasureTokens,
	shadowUtilities,
	themeTokens,
} from "@slotform/ui-core/emit";
import { HAIRLINE_PX, MODES } from "@slotform/ui-core/tokens";

// The `@theme` record: the namespace resets lead, then the scales, the
// families and the invariant and light colors, the two measures in px since
// uniwind reads no `ch`, and the hairline every border reads (the web has it
// on the root). On native every color
// utility resolves through the active theme's scoped variables, so which mode
// seeds `@theme` never shows at runtime.
export function themeDeclarations(
	resolved: ResolvedTheme,
): Record<string, string> {
	return {
		...themeTokens(resolved),
		...nativeMeasureTokens(resolved),
		"--hairline": `${HAIRLINE_PX}px`,
	};
}

// The utilities native declares itself, name to declarations: docs/architecture/plugins/native-ui.md, "Stylesheet".
export function utilityBlocks(): Array<[string, Record<string, string>]> {
	return [
		...Object.entries(shadowUtilities()),
		["tabular-nums", { "font-variant-numeric": "tabular-nums" }],
	];
}

// The `@variant` blocks: docs/architecture/plugins/native-ui.md, "Stylesheet".
export function modeBlocks(
	resolved: ResolvedTheme,
): Array<[string, Record<string, string>]> {
	return MODES.map((mode) => [mode, modeTokens(resolved, mode)]);
}
