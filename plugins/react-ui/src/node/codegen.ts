import {
	type CodegenAppCssPayload,
	type CssImport,
	cssBlockSchema,
	cssImportSchema,
	cssLayerSchema,
	cssSourceInlineSchema,
} from "../types.ts";
import {
	cssIdent,
	cssProperty,
	cssString,
	cssSupportsExpression,
	cssTokenValue,
} from "./css-escape.ts";

// The app's source root, relative to the project: the sheet scans it and the lint rules run on it
// with file routing off.
export const APP_SOURCE_DIR = "src";

// The `.stack/app.css` render, escaped and validated: docs/architecture/codegen.md, "CSS escape boundary".
export function aggregateAppCss(payload: CodegenAppCssPayload): string | null {
	if (
		payload.imports.length === 0 &&
		payload.sources.length === 0 &&
		payload.blocks.length === 0 &&
		payload.layers.length === 0
	) {
		return null;
	}

	const lines: string[] = [];
	for (const imp of payload.imports) {
		lines.push(renderImport(cssImportSchema.parse(imp)));
	}
	// `source(none)` roots the scan at declared sources: docs/architecture/plugins/react-ui.md, "Stylesheet assembly".
	lines.push(`@source "../${APP_SOURCE_DIR}";`);
	for (const pattern of payload.sources) {
		lines.push(
			`@source inline(${cssString(cssSourceInlineSchema.parse(pattern))});`,
		);
	}

	for (const raw of payload.blocks) {
		const block = cssBlockSchema.parse(raw);
		lines.push("");
		if (block.kind === "variant") {
			lines.push(`@custom-variant ${cssIdent(block.name)} {`);
			lines.push(block.content.trim());
		} else {
			lines.push(
				block.kind === "theme"
					? "@theme {"
					: `@utility ${cssIdent(block.name)} {`,
			);
			lines.push(...renderDeclarations(block.declarations));
		}
		lines.push("}");
	}

	for (const raw of payload.layers) {
		const layer = cssLayerSchema.parse(raw);
		lines.push("");
		lines.push(`@layer ${cssIdent(layer.name)} {`);
		lines.push(layer.content.trim());
		lines.push("}");
	}

	return `${lines.join("\n")}\n`;
}

// A rule whose declarations cross the render boundary: docs/architecture/codegen.md, "CSS escape boundary".
export function renderRule(
	selector: string,
	declarations: Record<string, string>,
): string {
	return [`${selector} {`, ...renderDeclarations(declarations), "}"].join("\n");
}

export function renderMediaRule(query: string, rule: string): string {
	return [`@media ${query} {`, rule, "}"].join("\n");
}

function renderDeclarations(declarations: Record<string, string>): string[] {
	return Object.entries(declarations).map(
		([property, value]) =>
			`\t${cssProperty(property)}: ${cssTokenValue(value)};`,
	);
}

function renderImport(imp: CssImport): string {
	if (typeof imp === "string") return `@import ${cssString(imp)};`;
	const parts = [`@import ${cssString(imp.url)}`];
	if (imp.layer !== undefined) parts.push(`layer(${cssIdent(imp.layer)})`);
	if (imp.supports !== undefined) {
		parts.push(`supports(${cssSupportsExpression(imp.supports)})`);
	}
	if (imp.source !== undefined) parts.push(`source(${imp.source})`);
	return `${parts.join(" ")};`;
}
