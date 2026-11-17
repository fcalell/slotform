// Keys that arrived on their own: docs/architecture/ui-core/motion.md, "Flow lines and blocks".
export function arrivals(
	known: ReadonlySet<string> | undefined,
	keys: readonly string[],
): ReadonlySet<string> {
	if (known === undefined) return new Set();
	return new Set(keys.filter((key) => !known.has(key)));
}
