import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename } from "node:path";
import { fallbackFace } from "@slotform/ui-core/tokens";
import type { Plugin, ResolvedConfig, Rolldown } from "vite";
import type { FontEntry } from "../types.ts";
import { cssString, cssTokenValue, cssUrl } from "./css-escape.ts";

export type { FontEntry };

// IBM Plex Sans's variable files on their weight axis, upright and italic.
// The fallback metrics size Arial to Plex Sans's box (ascender 1025 and
// descender 275 over a 1000 em, at the ratio of Plex Sans's average width
// 451/1000 to Arial's 913/2048), so the swap moves nothing. A family declares
// one fallback face, so the italic carries the upright's metrics.
const plexSansFallback: FontEntry["fallback"] = {
	family: "Arial",
	ascentOverride: "101.32%",
	descentOverride: "27.18%",
	lineGapOverride: "0%",
	sizeAdjust: "101.17%",
};

const plexSans: FontEntry = {
	family: "IBM Plex Sans",
	specifier:
		"@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2",
	weight: "100 700",
	style: "normal",
	fallback: plexSansFallback,
};

const plexSansItalic: FontEntry = {
	family: "IBM Plex Sans",
	specifier:
		"@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-italic.woff2",
	weight: "100 700",
	style: "italic",
	fallback: plexSansFallback,
};

// IBM Plex Mono ships static cuts only: 400 for code, 500 for emphasis inside
// it, 600 for the one-time-code digit. The fallback metrics size Courier New
// to Plex Mono's box (ascender 1025 and descender 275 over a 1000 em, at the
// ratio of its 600/1000 advance to Courier New's 1229/2048).
function plexMono(weight: "400" | "500" | "600"): FontEntry {
	return {
		family: "IBM Plex Mono",
		specifier: `@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-${weight}-normal.woff2`,
		weight,
		style: "normal",
		fallback: {
			family: "Courier New",
			ascentOverride: "102.52%",
			descentOverride: "27.5%",
			lineGapOverride: "0%",
			sizeAdjust: "99.98%",
		},
	};
}

export const defaultFonts: FontEntry[] = [
	plexSans,
	plexSansItalic,
	plexMono("400"),
	plexMono("500"),
	plexMono("600"),
];

class MissingFontError extends Error {
	constructor(font: FontEntry, cause: unknown) {
		const detail = cause instanceof Error ? cause.message : String(cause);
		super(
			`[react-ui] could not resolve font specifier ${JSON.stringify(
				font.specifier,
			)} for family ${JSON.stringify(font.family)}.\n` +
				"  - Ensure the package providing the font file is installed in your workspace.\n" +
				"  - Check the specifier path is correct (typos, wrong `files/` subpath, missing weight).\n" +
				`  - Underlying resolver error: ${detail}`,
		);
		this.name = "MissingFontError";
	}
}

function resolveFontAbs(font: FontEntry): string {
	try {
		const require = createRequire(import.meta.url);
		return require.resolve(font.specifier);
	} catch (err) {
		throw new MissingFontError(font, err);
	}
}

function joinBase(base: string, path: string): string {
	const b = base.endsWith("/") ? base : `${base}/`;
	const p = path.startsWith("/") ? path.slice(1) : path;
	return `${b}${p}`;
}

function findBundleUrl(
	bundle: Rolldown.OutputBundle,
	base: string,
	fontAbs: string,
): string | null {
	const target = basename(fontAbs);
	for (const entry of Object.values(bundle)) {
		if (entry.type !== "asset") continue;
		if (entry.originalFileNames.some((n) => n.endsWith(target))) {
			return joinBase(base, entry.fileName);
		}
		if (entry.fileName.endsWith(`/${target}`) || entry.fileName === target) {
			return joinBase(base, entry.fileName);
		}
	}
	return null;
}

// The system fonts a metric fallback may stand on: the named font, then the
// metric-compatible cuts a machine without it carries (Liberation and its
// ChromeOS twins Arimo and Cousine share Arial's and Courier New's advances),
// so the fallback face resolves on Linux as well.
const compatible: Record<string, string[]> = {
	Arial: ["Arial", "Liberation Sans", "Arimo", "Helvetica"],
	"Courier New": ["Courier New", "Liberation Mono", "Cousine"],
};

function localSources(family: string): string {
	return (compatible[family] ?? [family])
		.map((name) => `local(${cssString(name)})`)
		.join(", ");
}

function buildFontFaceCss(
	fonts: Array<{ font: FontEntry; href: string }>,
): string {
	const blocks: string[] = [];
	// A family's static cuts share one metric fallback face.
	const fallbacks = new Set<string>();
	for (const { font, href } of fonts) {
		// Every consumer-supplied value crosses the CSS escape boundary: docs/architecture/codegen.md, "CSS escape boundary".
		blocks.push(`@font-face {
	font-family: ${cssString(font.family)};
	src: ${cssUrl(href)} format("woff2");
	font-weight: ${cssTokenValue(font.weight)};
	font-style: ${font.style};
	font-display: swap;
}`);
		if (fallbacks.has(font.family)) continue;
		fallbacks.add(font.family);
		blocks.push(`@font-face {
	font-family: ${cssString(fallbackFace(font.family))};
	src: ${localSources(font.fallback.family)};
	ascent-override: ${cssTokenValue(font.fallback.ascentOverride)};
	descent-override: ${cssTokenValue(font.fallback.descentOverride)};
	line-gap-override: ${cssTokenValue(font.fallback.lineGapOverride)};
	size-adjust: ${cssTokenValue(font.fallback.sizeAdjust)};
}`);
	}
	return blocks.join("\n");
}

// The fonts argument is required: docs/architecture/plugins/react-ui.md, "Fonts".
export function themeFontsPlugin(fonts: FontEntry[]): Plugin {
	let config: ResolvedConfig;

	return {
		name: "fcalell:theme-fonts",

		configResolved(c) {
			config = c;
		},

		// Nothing in the module graph imports the woff2 files — the
		// @font-face CSS is injected as a raw <style> tag in
		// transformIndexHtml below, not through an `import` Rolldown can trace
		// — so a build never bundles them on its own. Emit each configured
		// font as a build asset explicitly; transformIndexHtml then finds it
		// in `ctx.bundle` by original filename (`findBundleUrl`).
		// `transformIndexHtml`'s hook `this` is only a
		// `MinimalPluginContext` (no `emitFile`/`getFileName`), so the
		// emission has to happen in a real build hook like this one.
		buildStart() {
			if (config.command !== "build") return;
			for (const font of fonts) {
				const abs = resolveFontAbs(font);
				this.emitFile({
					type: "asset",
					name: basename(abs),
					originalFileName: abs,
					source: readFileSync(abs),
				});
			}
		},

		transformIndexHtml: {
			order: "post",
			handler(_html, ctx) {
				const tags: Array<{
					tag: string;
					injectTo: "head" | "head-prepend";
					attrs?: Record<string, string | boolean>;
					children?: string;
				}> = [];

				const resolved: Array<{ font: FontEntry; href: string }> = [];

				for (const font of fonts) {
					// Throws MissingFontError with an actionable message if the
					// consumer's specifier is bogus. Better to surface that at
					// build time than to emit CSS pointing at a missing woff2.
					const abs = resolveFontAbs(font);
					let href: string;
					if (config.command === "build" && ctx.bundle) {
						const fromBundle = findBundleUrl(ctx.bundle, config.base, abs);
						if (!fromBundle) {
							// `buildStart` above emits every configured font before
							// this hook runs, so this branch is an internal
							// invariant violation (e.g. another plugin stripped the
							// asset from the bundle), not an author-land mistake.
							throw new Error(
								`[react-ui] internal error: resolved ${JSON.stringify(
									font.specifier,
								)} for family ${JSON.stringify(font.family)}, ` +
									"but it was not found in the emitted bundle even though " +
									"buildStart emits it as an asset. This should not happen — " +
									"please report a bug.",
							);
						}
						href = fromBundle;
					} else {
						href = `/@fs/${abs}`;
					}
					resolved.push({ font, href });

					tags.push({
						tag: "link",
						injectTo: "head",
						attrs: {
							rel: "preload",
							as: "font",
							type: "font/woff2",
							href,
							crossorigin: "",
						},
					});
				}

				if (resolved.length > 0) {
					tags.push({
						tag: "style",
						injectTo: "head",
						children: buildFontFaceCss(resolved),
					});
				}

				return tags;
			},
		},
	};
}
