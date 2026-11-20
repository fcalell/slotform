import { themeSchema, wordsSchema } from "@slotform/ui-core/schema";
import { z } from "zod";
import { isCssIdent, isCssSupportsExpression } from "./node/css-escape.ts";

// A CSS `@import`, shorthand or structured: docs/architecture/slot-catalog.md, "`reactUi.slots.*` (the `react-ui` plugin)".
export const cssImportSchema = z.union([
	z.string().min(1, "css @import url must be a non-empty string"),
	z.object({
		url: z.string().min(1, "css @import url must be a non-empty string"),
		layer: z
			.string()
			.optional()
			.refine(
				(v) => v === undefined || isCssIdent(v),
				"css @import layer(...) argument must be a CSS <ident>",
			),
		supports: z
			.string()
			.optional()
			.refine(
				(v) => v === undefined || isCssSupportsExpression(v),
				"css @import supports(...) argument must be a balanced parenthesized feature query without ';' / '{' / '}'",
			),
		// Tailwind v4's `source(none)`: no automatic content detection, so only
		// the sheet's `@source` declarations are scanned.
		source: z.literal("none").optional(),
	}),
]);

export type CssImport = z.input<typeof cssImportSchema>;

// `@layer <name>` — name must be a CSS <ident>.
export const cssLayerSchema = z.object({
	name: z
		.string()
		.refine((v) => isCssIdent(v), "css @layer name must be a CSS <ident>"),
	content: z.string(),
});

export type CssLayer = z.input<typeof cssLayerSchema>;

// A top-level `@theme`, `@utility` or `@custom-variant` block: docs/architecture/slot-catalog.md, "`reactUi.slots.*` (the `react-ui` plugin)".
const cssDeclarationsSchema = z.record(z.string(), z.string());

export const cssBlockSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("theme"),
		declarations: cssDeclarationsSchema,
	}),
	z.object({
		kind: z.literal("utility"),
		// Validated at the render boundary by `cssIdent`, so a malformed name
		// throws an error that names the contributing plugin.
		name: z.string(),
		declarations: cssDeclarationsSchema,
	}),
	z.object({
		kind: z.literal("variant"),
		name: z.string(),
		content: z.string(),
	}),
]);

export type CssBlock = z.input<typeof cssBlockSchema>;

// An `@source inline` pattern: docs/architecture/slot-catalog.md, "`reactUi.slots.*` (the `react-ui` plugin)".
export const cssSourceInlineSchema = z
	.string()
	.regex(
		/^[a-z0-9{},.:-]+$/,
		"css @source inline(...) pattern must be class characters and braces",
	);

export type CssSourceInline = z.input<typeof cssSourceInlineSchema>;

// The inputs of `.slotform/app.css`: docs/architecture/slot-catalog.md, "`reactUi.slots.*` (the `react-ui` plugin)".
export interface CodegenAppCssPayload {
	imports: CssImport[];
	sources: CssSourceInline[];
	blocks: CssBlock[];
	layers: CssLayer[];
}

// A webfont file: docs/architecture/plugins/react-ui.md, "Fonts".
const fontEntrySchema = z.object({
	// CSS family name used in `font-family` declarations (e.g. "IBM Plex Sans").
	family: z.string(),
	// Node module path or workspace-relative path to the actual woff2 file
	// (e.g. "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2").
	specifier: z.string(),
	// A single weight ("400") or a variable-font range ("100 900").
	weight: z.string(),
	style: z.enum(["normal", "italic"]),
	// Fallback-font metrics used to generate a sibling `@font-face` that
	// matches the webfont's metrics on top of a system family. Prevents CLS
	// while the woff2 loads.
	fallback: z.object({
		family: z.string(),
		ascentOverride: z.string(),
		descentOverride: z.string(),
		lineGapOverride: z.string(),
		sizeAdjust: z.string(),
	}),
});

export type FontEntry = z.infer<typeof fontEntrySchema>;

// The options: plugins/react-ui/guide/reference.md, "Options".
export const reactUiOptionsSchema = z.object({
	fonts: z.array(fontEntrySchema).optional(),
	theme: themeSchema.optional(),
	words: wordsSchema.optional(),
});

export type ReactUiOptions = z.input<typeof reactUiOptionsSchema>;

// The `theme` option's own type. It is ui-core's, re-exported here so a
// consumer reaches it through the plugin it configures.
export type { Theme } from "@slotform/ui-core/schema";
export type { Words } from "@slotform/ui-core/tokens";
