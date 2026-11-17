// Where a text may and may not break: docs/architecture/plugins/native-ui.md, "Text breaks". Pure strings, so a test reads them.

// The joiner and the break are for a text drawn and never selected: docs/architecture/plugins/native-ui.md, "Text breaks".
const JOINER = "\u2060";
const BREAK = "\u200B";

// A hyphen that leads a word binds to the word after it (a flag, `--bg`); a
// hyphen inside a word is the platform's own break, after it.
export function codeBound(code: string): string {
	return code.replace(/(?<!\S)-+(?=[^\s-])/g, (run) =>
		run.replaceAll("-", `-${JOINER}`),
	);
}

// A path's or URL's separators offer a break after each run of them (a slash,
// `?`, `&`, `=`, `#`), never inside a run (`../`, `://`) nor before a space; a
// flag binds to its name. A long path breaks between segments, and inside a
// segment only where that segment alone is wider than the line.
export function codeWhole(code: string): string {
	return codeBound(code).replace(/(?<=[/?&=#])(?=[^/?&=#\s\u2060])/g, BREAK);
}

// A hyphen inside a word of a title breaks after it, as the web's does, and
// never before it (`Pre-` / `release`, never `Pre` / `-release`): a word joiner
// ahead of the hyphen takes the break before it away, so a wrapped title never
// starts a line on a hyphen, whatever fits.
export function titleBound(title: string): string {
	return title.replace(/(?<=\w)(?=-\w)/g, JOINER);
}
