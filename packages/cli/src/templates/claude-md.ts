const IMPORT = "@.stack/guide.md";

// The consumer's `CLAUDE.md` imports the guide's index: docs/architecture/consumer-project.md, "The guide".
export function claudeMdTemplate(existing: string | null): string | null {
	if (existing === null) return `${IMPORT}\n`;
	if (existing.split("\n").some((line) => line.trim() === IMPORT)) return null;
	const body = existing.trimEnd();
	return body === "" ? `${IMPORT}\n` : `${body}\n\n${IMPORT}\n`;
}
