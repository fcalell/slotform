// The document's language, or the platform's own where there is no document
// or it names none.
export function pageLang(): string | undefined {
	return typeof document === "undefined"
		? undefined
		: document.documentElement.lang || undefined;
}
