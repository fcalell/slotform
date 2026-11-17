// A reply that is still arriving, its open runs closed: docs/architecture/ui-core/components.md, "Streaming Markdown".

type Opener = "*" | "**" | "_" | "__" | "~~" | "[";

const WORD = /[\p{L}\p{N}]/u;
const BLANK = /\n[ \t]*\n/g;

// The last paragraph of `text`: inline runs never cross a blank line.
function lastParagraph(text: string): string {
	let start = 0;
	for (const blank of text.matchAll(BLANK))
		start = blank.index + blank[0].length;
	return text.slice(start);
}

// The fence an unfinished fenced block was opened with, else `undefined`.
function openFence(text: string): string | undefined {
	let fence: { char: string; size: number } | undefined;
	for (const line of text.split("\n")) {
		const mark = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
		if (!mark) continue;
		const char = mark[0] ?? "`";
		if (!fence) fence = { char, size: mark.length };
		else if (
			char === fence.char &&
			mark.length >= fence.size &&
			line.trim() === mark
		)
			fence = undefined;
	}
	return fence ? fence.char.repeat(fence.size) : undefined;
}

// What closes an inline run opened as `opener`.
const CLOSER: Record<Opener, string> = {
	"*": "*",
	"**": "**",
	_: "_",
	__: "__",
	"~~": "~~",
	"[": "]()",
};

const runOf = (text: string, at: number, char: string): string => {
	let end = at;
	while (text[end] === char) end += 1;
	return text.slice(at, end);
};

// `markdown` with every run still open at its end closed (a fence, an emphasis, strong or strike run, a code span, a link's text or target), so it reads in the form it is becoming. A marker run at the very end that closes nothing is held back, the next character decides what it is, and the closers go before any trailing whitespace, which is dropped. A closed text comes back as it is.
export function closeOpenRuns(markdown: string): string {
	const fence = openFence(markdown);
	if (fence) return `${markdown}${markdown.endsWith("\n") ? "" : "\n"}${fence}`;
	const tail = lastParagraph(markdown);
	const stack: Opener[] = [];
	let code: string | undefined;
	let target = false;
	// Where, in `tail`, the marker run at its very end starts when it closes nothing: the next character decides what it is.
	let held: number | undefined;
	let at = 0;
	while (at < tail.length) {
		const char = tail[at] ?? "";
		if (code !== undefined) {
			if (char === "`") {
				const run = runOf(tail, at, "`");
				if (run === code) code = undefined;
				at += run.length;
			} else at += 1;
			continue;
		}
		if (char === "\\") {
			at += 2;
			continue;
		}
		if (char === "`") {
			const start = at;
			const run = runOf(tail, at, "`");
			at += run.length;
			if (at < tail.length) code = run;
			else held = start;
			continue;
		}
		if (char === "[") {
			stack.push("[");
			at += 1;
			continue;
		}
		if (char === "]") {
			const open = stack.lastIndexOf("[");
			at += 1;
			if (open < 0) continue;
			stack.length = open;
			if (tail[at] !== "(") continue;
			const close = tail.indexOf(")", at + 1);
			if (close < 0) target = true;
			at = close < 0 ? tail.length : close + 1;
			continue;
		}
		if (char !== "*" && char !== "_" && char !== "~") {
			at += 1;
			continue;
		}
		const start = at;
		const size = runOf(tail, at, char).length;
		const before = at > 0 ? (tail[at - 1] ?? "") : "";
		const after = tail[at + size] ?? "";
		at += size;
		if (char === "~" && size < 2) continue;
		// An underscore inside a word is text.
		if (char === "_" && WORD.test(before) && WORD.test(after)) continue;
		let left = size;
		if (before !== "" && !/\s/.test(before)) {
			const strong: Opener = char === "~" ? "~~" : char === "*" ? "**" : "__";
			while (left > 0) {
				const two = left >= 2 ? stack.lastIndexOf(strong) : -1;
				// Past the `~` test `char` is `*` or `_`, each an opener of its own.
				const one = char === "~" ? -1 : stack.lastIndexOf(char as Opener);
				if (two >= 0) {
					stack.length = two;
					left -= 2;
				} else if (one >= 0) {
					stack.length = one;
					left -= 1;
				} else break;
			}
		}
		if (left > 0 && after === "") held = start;
		if (left === 0 || after === "" || /\s/.test(after)) continue;
		if (char === "_" && WORD.test(before)) continue;
		if (char === "~") stack.push("~~");
		else {
			if (left >= 2) {
				stack.push(char === "*" ? "**" : "__");
				left -= 2;
			}
			// `char` is `*` or `_` here, each an opener of its own.
			if (left === 1) stack.push(char as Opener);
		}
	}
	let closing = code ?? "";
	if (target) closing += ")";
	for (const opener of stack.toReversed()) closing += CLOSER[opener];
	if (held === undefined && closing === "") return markdown;
	const kept =
		held === undefined
			? markdown
			: markdown.slice(0, markdown.length - tail.length + held);
	return kept.trimEnd() + closing;
}
