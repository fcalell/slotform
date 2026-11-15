import { readsOf, type Selection } from "@fcalell/ui-core/read";
import type { QueryClient } from "@tanstack/react-query";
import { skipToken } from "@tanstack/react-query";

// Warms the cache for a route before its components mount, in the client the
// caller hands it: the web router carries it as its context and the phone's
// press takes it from its provider, so no client is shared module-wide.
// Starts each distinct read of the selections and never waits for it: a route's
// `loader` returns at once, so navigation is never held. TanStack's own
// `staleTime` makes a fresh read a no-op, and a failed prefetch is swallowed
// (the leaf that mounts later retries and draws the failure). A stream never
// settles with no observer to abort it, and an idle read has no function to
// run, so neither is started.
export function preload(
	client: QueryClient,
	...selections: readonly Selection<unknown>[]
): void {
	const seen = new Set<string>();
	for (const r of selections.flatMap(readsOf)) {
		if (seen.has(r.key)) continue;
		seen.add(r.key);
		if (
			r.kind === "stream" ||
			r.options.queryFn === skipToken ||
			r.options.enabled === false
		) {
			continue;
		}
		// biome-ignore lint/suspicious/noExplicitAny: a read's options are one type for every output (variance)
		const options = r.options as any;
		// A pages read's options are infinite ones.
		void (r.kind === "pages"
			? client.prefetchInfiniteQuery(options)
			: client.prefetchQuery(options));
	}
}
