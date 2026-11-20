import { themeSchema, wordsSchema } from "@slotform/ui-core/schema";
import { z } from "zod";

// ── Plugin options ─────────────────────────────────────────────────

// A font file to embed natively through expo-font. The family it carries is
// named by `theme.fonts` (`sans`, `mono`); this entry only brings the file.
const nativeFontSchema = z.object({
	// Native font-family name as registered with the OS / expo-font.
	family: z.string().min(1),
	// Path to the font file, consumer-relative.
	source: z.string().min(1),
});

export type NativeFontEntry = z.input<typeof nativeFontSchema>;

// Client module shape: docs/architecture/plugins/native-ui.md, "Native clients in src/lib".
const clientModuleSchema = z.object({
	source: z.string().min(1),
	export: z.string().min(1),
});

export const nativeUiOptionsSchema = z.object({
	// The design contract's knobs and the start mode: docs/architecture/ui-core/tokens.md, "Knobs".
	theme: themeSchema.optional(),
	// Every word a molecule draws on its own, every key required. Omitted,
	// English.
	words: wordsSchema.optional(),
	// Font files to embed. Omitted, no file is embedded and the families named
	// by the theme are expected on the device.
	fonts: z.array(nativeFontSchema).optional(),
	// Module exporting the configured native auth client (`createAuthClient`).
	authClientModule: clientModuleSchema.optional(),
	// Module exporting the shared TanStack Query client (`createQueryClient`).
	queryClientModule: clientModuleSchema.optional(),
});

export type NativeUiOptions = z.input<typeof nativeUiOptionsSchema>;

// The `theme` and `words` types are ui-core's, re-exported here so a consumer
// reaches them through the plugin it configures.
export type { Theme } from "@slotform/ui-core/schema";
export type { Words } from "@slotform/ui-core/tokens";
