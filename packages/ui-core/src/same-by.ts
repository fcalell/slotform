// A collection row's `memo` comparison, the same on both platforms. Pure.

type Walked = Readonly<Record<string, unknown>>;

// What structural sharing walks into: an array with no holes and no keys of its
// own besides its items, or an object on `Object.prototype` or on none.
// Anything else is the same only as itself.
function walked(value: unknown): value is Walked {
	if (Array.isArray(value)) {
		return value.length === Object.keys(value).length;
	}
	if (Object.prototype.toString.call(value) !== "[object Object]") return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === null || prototype === Object.prototype;
}

// Whether structural sharing would keep `was` for `now`: the same value, or two
// arrays or two plain objects with the same keys whose values are each the
// same, the same way. Past 500 levels nothing is the same.
function sameDeep(was: unknown, now: unknown, depth: number): boolean {
	if (was === now) return true;
	if (depth > 500 || !walked(was) || !walked(now)) return false;
	if (Array.isArray(was) !== Array.isArray(now)) return false;
	const keys = Object.keys(now);
	if (Object.keys(was).length !== keys.length) return false;
	return keys.every((key) =>
		was[key] === now[key]
			? Object.hasOwn(was, key)
			: sameDeep(was[key], now[key], depth + 1),
	);
}

/** `memo`'s comparison for a collection's row: its props are equal when each is the same one, and its `by` prop (the row's item) is deeply equal to the last; a prop in `ignored` is read once, when the row mounts, and never renders it again. A read shares unchanged items only by position, so an item landing at the top hands every row below it a copy of the item above's old place; compared by value, those rows draw nothing again. */
export function sameBy<K extends string>(by: K, ...ignored: string[]) {
	return <P extends Record<K, unknown>>(was: P, now: P): boolean => {
		const both: readonly Walked[] = [was, now];
		for (const key of new Set([...Object.keys(was), ...Object.keys(now)])) {
			if (ignored.includes(key)) continue;
			const [a, b] = both.map((props) => props[key]);
			if (key === by ? !sameDeep(a, b, 0) : !Object.is(a, b)) return false;
		}
		return true;
	};
}
