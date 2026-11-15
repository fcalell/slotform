// An object with one value per key. A `Record<K, V>` cannot be built key by
// key without a cast: the object starts empty, and the loop fills every key.
export function record<K extends string, V>(
	keys: readonly K[],
	value: (key: K) => V,
): Record<K, V> {
	const out = {} as Record<K, V>;
	for (const key of keys) out[key] = value(key);
	return out;
}
