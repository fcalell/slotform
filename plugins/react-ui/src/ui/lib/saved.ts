import { createStore } from "@fcalell/ui-core/store";

// A viewer's choice is theirs from one visit to the next: a convenience, so a
// store that is blocked or empty leaves the choice for the visit alone. What
// was read or written stands here, the one source every part of the page
// reads.
const held = createStore(new Map<string, string | null>());

export const subscribeSaved = held.subscribe;

export function savedChoice(key: string): string | null {
	const saved = held.get();
	if (!saved.has(key)) {
		try {
			saved.set(key, localStorage.getItem(key));
		} catch {
			saved.set(key, null);
		}
	}
	return saved.get(key) ?? null;
}

export function saveChoice(key: string, value: string): void {
	held.get().set(key, value);
	try {
		localStorage.setItem(key, value);
	} catch {}
	held.emit();
}
