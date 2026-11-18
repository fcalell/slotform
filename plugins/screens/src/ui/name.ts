// What the walk and the press read as an element's name.

// A text with each run of white space as one space, cut at `max` characters.
export const squash = (
	text: string | null | undefined,
	max = Number.POSITIVE_INFINITY,
): string => (text ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// The name `aria-label` gives, or the text of the elements `aria-labelledby`
// names; empty when neither gives one.
export function ariaName(element: Element): string {
	const label = element.getAttribute("aria-label");
	if (label) return squash(label);
	return squash(
		(element.getAttribute("aria-labelledby") ?? "")
			.split(/\s+/)
			.map((id) => document.getElementById(id)?.textContent ?? "")
			.join(" "),
	);
}
