import type { LinkAct } from "@slotform/ui-core/descriptors";
import { createStore } from "@slotform/ui-core/store";
import { TOAST_MS, type Tone } from "@slotform/ui-core/tokens";
import { createContext, useSyncExternalStore } from "react";
import type { Act } from "./act";

// The toast queue: docs/architecture/plugins/native-ui.md, "Container host".
export interface ToastOptions {
	tone?: Tone;
	act?: Act | LinkAct;
	// Called once the toast has left, however it went.
	onGone?: () => void;
}

export interface ToastEntry extends ToastOptions {
	id: number;
	sentence: string;
}

const entries = createStore<ToastEntry[]>([]);
let nextId = 1;

/** Queues a toast: `sentence` is what happened (a sentence; wraps). */
export function toast(sentence: string, options: ToastOptions = {}): void {
	const id = nextId++;
	entries.set([...entries.get(), { id, sentence, ...options }]);
	setTimeout(() => dismissToast(id), TOAST_MS);
}

export function dismissToast(id: number): void {
	const queue = entries.get();
	const gone = queue.find((entry) => entry.id === id);
	if (!gone) return;
	entries.set(queue.filter((entry) => entry.id !== id));
	gone.onGone?.();
}

export function useToasts(): ToastEntry[] {
	return useSyncExternalStore(entries.subscribe, entries.get);
}

// The queued toast a `Toast` stands for: the layer hands each its id, which it
// dismisses itself by.
export const ToastId = createContext<number | undefined>(undefined);
