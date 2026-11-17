// Whether leaving a form asks: docs/architecture/ui-core/acts.md, "Leave".
export interface Leave {
	// Whether the form stands edited: a field holds a value other than its first (`true`), or none does (`false`).
	edit(edited: boolean): void;
	// The filled act was pressed: the form no longer stands edited and holds no question while the act runs, so an act that navigates (at once or once its promise resolves) is never asked.
	press(): void;
	// The filled act ended, resolved or `rejected` (an act that throws or whose promise rejects): a rejection puts back the edit the press took, since the form was not saved.
	settle(rejected: boolean): void;
	// Whether a leave now would ask: edited and no act running. The browser's `beforeunload` reads it at the leave; the phone holds a removal only while it is true.
	asks(): boolean;
	// Calls `listener` whenever `asks()` may have turned; returns the unsubscribe.
	subscribe(listener: () => void): () => void;
	// One leave: `true` where it may go ahead, with no question while the form asks nothing or while another question is open, the leave then held. `ask` resolves `true` to discard the edit and `false` to keep editing; a discard clears the edit, so the leave it lets through is not asked again.
	attempt(ask: () => Promise<boolean>): Promise<boolean>;
}

export function createLeave(): Leave {
	let edited = false;
	let pending = false;
	// The edit a press took, back if the act is rejected.
	let held = false;
	let asking = false;
	const listeners = new Set<() => void>();
	const changed = () => {
		for (const listener of listeners) listener();
	};
	const asks = () => edited && !pending;
	return {
		edit(now) {
			edited = now;
			changed();
		},
		press() {
			held = edited;
			edited = false;
			pending = true;
			changed();
		},
		settle(rejected) {
			pending = false;
			if (rejected && held) edited = true;
			held = false;
			changed();
		},
		asks,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		async attempt(ask) {
			if (!asks()) return true;
			if (asking) return false;
			asking = true;
			try {
				const discard = await ask();
				if (discard) {
					edited = false;
					changed();
				}
				return discard;
			} finally {
				asking = false;
			}
		},
	};
}
