import { createStore, type Store } from "./store.ts";

// The queue the decisions and the sheets acts open are each built on: each
// entry takes an id as it is added, and they stand in the order added. Its
// entries are read-only; `add` and `remove` (false for an id no entry has) are
// the writers.
export type QueueEntry<T> = T & { id: number };

export interface IdQueue<T> {
	entries: Pick<Store<QueueEntry<T>[]>, "get" | "subscribe" | "size">;
	add(item: T): number;
	remove(id: number): boolean;
}

export function createIdQueue<T extends object>(): IdQueue<T> {
	const store = createStore<QueueEntry<T>[]>([]);
	let nextId = 1;
	return {
		entries: store,
		add(item) {
			const id = nextId++;
			store.set([...store.get(), { ...item, id }]);
			return id;
		},
		remove(id) {
			if (!store.get().some((entry) => entry.id === id)) return false;
			store.set(store.get().filter((entry) => entry.id !== id));
			return true;
		},
	};
}
