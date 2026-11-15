// Digit-aware so a slug like "plugin-2d" maps to a valid identifier ("plugin2d")
// rather than leaving a stray hyphen.
export function toCamelCase(name: string): string {
	return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}
