// Shared CSS escape and validation primitives for plugin codegen: docs/architecture/codegen.md, "CSS escape boundary".

// ── Strings & URLs ──────────────────────────────────────────────────

const STRING_ESCAPE_RE = /[\\"\n\r\f]/g;
const STRING_ESCAPE_MAP: Record<string, string> = {
	"\\": "\\\\",
	'"': '\\"',
	"\n": "\\A ",
	"\r": "\\D ",
	"\f": "\\C ",
};

// Returns a properly-quoted CSS <string> token. Double-quoted so it composes
// safely with single-quoted fragments.
//   cssString("IBM Plex Sans")   → `"IBM Plex Sans"`
//   cssString('Foo"Bar')         → `"Foo\"Bar"`
//   cssString("a\nb")            → `"a\\A b"`
export function cssString(value: string): string {
	const escaped = value.replace(
		STRING_ESCAPE_RE,
		(c) => STRING_ESCAPE_MAP[c] ?? c,
	);
	return `"${escaped}"`;
}

// Returns the full quoted `url("...")` token. The URL is validated for gross
// structural problems (control chars) then escaped via the string rules.
export function cssUrl(value: string, label: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`[${label}] cssUrl: empty URL`);
	}
	// Disallow raw C0 control characters (0x00–0x1F: newlines, tabs, etc.) —
	// they corrupt the stylesheet and have no legitimate use in a URL. Spaces
	// (0x20) are allowed.
	// biome-ignore lint/suspicious/noControlCharactersInRegex: validating against control chars is the point
	if (/[\u0000-\u001f]/.test(value)) {
		throw new Error(
			`[${label}] cssUrl: URL contains control characters: ${JSON.stringify(value)}`,
		);
	}
	return `url(${cssString(value)})`;
}

// ── Identifiers ─────────────────────────────────────────────────────

// CSS <ident-token> grammar (simplified, ASCII-only). Non-ASCII is rejected to
// keep generated CSS portable across minifiers and tooling.
const IDENT_RE = /^-?[A-Za-z_][A-Za-z0-9_-]*$/;

export function isCssIdent(value: unknown): value is string {
	return typeof value === "string" && IDENT_RE.test(value);
}

// Validates that `value` is a legal CSS <ident> and returns it unchanged.
// Throws with a precise message — callers shouldn't catch; an invalid ident
// always indicates a bug in the contributing plugin.
export function cssIdent(value: string, label: string): string {
	if (!isCssIdent(value)) {
		throw new Error(
			`[${label}] invalid CSS identifier: ${JSON.stringify(value)}. ` +
				"Expected an ASCII <ident-token>: optional leading '-', start with a letter or '_', " +
				"followed by letters, digits, '_' or '-'.",
		);
	}
	return value;
}

// ── Parenthesis balance ─────────────────────────────────────────────

// Parentheses are checked per value: docs/architecture/codegen.md, "CSS escape boundary".
function parensBalanced(value: string): boolean {
	let depth = 0;
	for (const ch of value) {
		if (ch === "(") depth++;
		else if (ch === ")") {
			depth--;
			if (depth < 0) return false;
		}
	}
	return depth === 0;
}

// ── Custom properties ───────────────────────────────────────────────

// A custom-property NAME. Three shapes are legal:
//   --radius-md                 a plain token name
//   --text-h1--line-height      the Tailwind v4 modifier form
//   --color-*                   a Tailwind v4 namespace reset key
const VAR_NAME_RE = /^--[A-Za-z_][A-Za-z0-9_-]*(-\*)?$/;

export function cssVarName(value: string, label: string): string {
	if (typeof value !== "string" || !VAR_NAME_RE.test(value)) {
		throw new Error(
			`[${label}] invalid CSS custom-property name: ${JSON.stringify(value)}. ` +
				'Expected a "--"-prefixed <ident>, optionally ending in "-*" ' +
				'(e.g. "--radius-md", "--text-h1--line-height", "--color-*").',
		);
	}
	return value;
}

// A custom-property VALUE (color, length, font stack, shadow list). Unlike a
// CSS <string> these are raw token streams — `oklch(0.2 0.05 220)`, `4px` — so
// they must NOT be quoted: spaces, parens and commas are legal. Rejected are
// the sequences that would let a value escape its declaration: the statement /
// block terminators, the line breaks that close a declaration, a comment
// delimiter, which would swallow the rest of the emitted block, and a
// backslash, which escapes the character after it (`red\` then `;`).
// Unbalanced parens are rejected for the reason `parensBalanced` gives above.
const TOKEN_VALUE_ILLEGAL_RE = /[;{}\\\n\r\f]|\/\*|\*\//;

export function cssTokenValue(value: string, label: string): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`[${label}] cssTokenValue: empty value`);
	}
	if (TOKEN_VALUE_ILLEGAL_RE.test(value)) {
		throw new Error(
			`[${label}] cssTokenValue: value contains illegal characters: ${JSON.stringify(value)}`,
		);
	}
	if (!parensBalanced(value)) {
		throw new Error(
			`[${label}] cssTokenValue: value has unbalanced parentheses: ${JSON.stringify(value)}`,
		);
	}
	return value.trim();
}

// ── Supports conditions ─────────────────────────────────────────────

// `@supports` / `@import ... supports(...)` arguments are nested feature
// queries (parens, and/or/not, declarations, selector(...), …). A full parser
// is out of scope; this is a cheap boundary that rejects empty input, the
// statement terminators that allow CSS escape (`;`, `{`, `}`), and unbalanced
// parens. Anything that passes is rendered verbatim.
export function isCssSupportsExpression(value: unknown): value is string {
	if (typeof value !== "string") return false;
	const trimmed = value.trim();
	if (trimmed.length === 0) return false;
	if (/[;{}]/.test(trimmed)) return false;
	return parensBalanced(trimmed);
}

export function cssSupportsExpression(value: string, label: string): string {
	if (!isCssSupportsExpression(value)) {
		throw new Error(
			`[${label}] invalid @supports expression: ${JSON.stringify(value)}. ` +
				"Expected a balanced parenthesized feature query containing no ';' / '{' / '}'.",
		);
	}
	return value.trim();
}
