import { readsOf, type Selection } from "@fcalell/ui-core/read";
import type { QueryClient } from "@tanstack/react-query";
import { skipToken } from "@tanstack/react-query";

// Warms the cache for a route before its components mount: docs/architecture/plugins/query.md, "Preload".
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
