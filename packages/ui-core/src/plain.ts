// A plain object: one on `Object.prototype` or on none, never an array, a class
// instance or a function.
export function isPlain(v: unknown): v is Record<string, unknown> {
	if (typeof v !== "object" || v === null) return false;
	const proto = Object.getPrototypeOf(v);
	return proto === Object.prototype || proto === null;
}
