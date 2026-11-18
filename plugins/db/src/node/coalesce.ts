// The coalescing latch for local schema pushes: docs/architecture/plugins/db.md, "Local dev push".
// At most one run in flight and one queued; a call while one is queued joins it.
// The queued run starts once the one in flight settles, fulfilled or rejected.
export function coalesce(op: () => Promise<void>): () => Promise<void> {
	let current: Promise<void> | null = null;
	let queued: Promise<void> | null = null;
	const start = (): Promise<void> => {
		queued = null;
		current = op().finally(() => {
			current = null;
		});
		return current;
	};
	return () => {
		if (queued) return queued;
		if (!current) return start();
		queued = current.then(start, start);
		return queued;
	};
}
