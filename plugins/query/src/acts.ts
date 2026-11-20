import { fallbackORPCErrorMessage, ORPCError } from "@orpc/client";
import {
	type Issue,
	isThenable,
	Unreached,
	wasDrawn,
} from "@slotform/ui-core/acts";
import { dev, type Read } from "@slotform/ui-core/read";
import {
	hashKey,
	type MutationCache,
	onlineManager,
	type QueryCache,
	type QueryClient,
} from "@tanstack/react-query";

// The binding's half of an act: docs/architecture/plugins/query.md, "Acts".

// The server's own message as a sentence: capitalised, one closing stop (a
// question or an exclamation keeps its own).
function asSentence(message: string): string {
	const body = `${message.charAt(0).toUpperCase()}${message.slice(1).replace(/[.\s]*$/, "")}`;
	return /[?!]$/.test(body) ? body : `${body}.`;
}

// A standard-schema issue's path segment is a key or `{ key }`.
function segment(step: unknown): string | number {
	const key =
		typeof step === "object" && step !== null && "key" in step
			? (step as { key: unknown }).key
			: step;
	return typeof key === "number" ? key : String(key);
}

/** What the server's input schema refused: each issue's message and path from a `BAD_REQUEST` that failed validation, in the schema's order; none for any other error. A `FormField` says its own: `issues(error).find((i) => i.path[0] === "name")?.message`. */
export function issues(error: unknown): Issue[] {
	if (!(error instanceof ORPCError) || error.code !== "BAD_REQUEST") return [];
	const { data } = error;
	if (typeof data !== "object" || data === null || !("issues" in data)) {
		return [];
	}
	const listed = (data as { issues: unknown }).issues;
	if (!Array.isArray(listed)) return [];
	return listed.flatMap((item: unknown) => {
		if (typeof item !== "object" || item === null) return [];
		const { message, path } = item as { message?: unknown; path?: unknown };
		if (typeof message !== "string" || message.trim() === "") return [];
		return [
			{
				path: Array.isArray(path) ? path.map(segment) : [],
				message: asSentence(message.trim()),
			},
		];
	});
}

// `refusal`: docs/architecture/plugins/query.md, "Acts".
export function refusal(error: unknown): string | undefined {
	if (!(error instanceof ORPCError)) return undefined;
	const { status, code, message } = error;
	if (status < 400 || status >= 500) return undefined;
	if ([401, 403, 404, 429].includes(status)) return undefined;
	const [first] = issues(error);
	if (first) return first.message;
	const text = message.trim();
	if (text === "" || text === fallbackORPCErrorMessage(code, undefined)) {
		return undefined;
	}
	return asSentence(text);
}

// `retries`: docs/architecture/plugins/query.md, "Acts".
export function retries(error: unknown): boolean {
	if (error instanceof Unreached) return false;
	if (!(error instanceof ORPCError)) return true;
	const { status } = error;
	if (status === 408 || status === 429) return true;
	return status < 400 || status >= 500;
}

// An act's `onAct`, called. In dev it names a mutation the call started
// without returning a promise: `mutate()` in place of `return mutateAsync()`,
// so the act could not hold it and would read as done at once. A mutation is
// built in the cache synchronously, so one added during the call is the act's.
export function heldAct(cache: MutationCache, onAct: () => unknown): unknown {
	if (!dev()) return onAct();
	const seen = new Set(cache.getAll());
	const result = onAct();
	if (isThenable(result)) return result;
	for (const mutation of cache.getAll()) {
		if (seen.has(mutation)) continue;
		console.error(
			`The act started the mutation ${nameOf(mutation)} and returned no promise. Return mutateAsync's promise so the act holds it.`,
		);
	}
	return result;
}

function nameOf(mutation: { options: { mutationKey?: readonly unknown[] } }) {
	const key = mutation.options.mutationKey;
	return key ? hashKey(key) : "(no mutation key)";
}

// A mutation that failed with no host to draw it and no `onError` of its own
// is a failure nobody sees. A host marks the rejection it drew with `drew`
// within the microtasks after it rejects, so one macrotask is the wait.
// `QueryProvider` runs this in dev, over the mutation cache.
export function watchActs(cache: MutationCache): () => void {
	if (!dev()) return () => {};
	return cache.subscribe((event) => {
		if (event.type !== "updated" || event.action.type !== "error") return;
		if (event.mutation.options.onError !== undefined) return;
		const error = event.action.error;
		setTimeout(() => {
			if (wasDrawn(error)) return;
			console.error(
				`The mutation ${nameOf(event.mutation)} failed and nothing drew its failure. Return mutateAsync's promise from an act, or give the mutation an onError.`,
			);
		}, 0);
	});
}

// The query cache's fetches of these reads are over. A save's invalidation
// starts the refetch synchronously in the mutation's `onSuccess`, before the
// save's promise resolves, so a read idle at that moment is not being
// refreshed. A stream stays fetching while it writes and would never end.
export function whenSettled(
	cache: QueryCache,
	reads: readonly Read<unknown>[],
): Promise<void> {
	const watching = reads.filter((r) => r.kind !== "stream");
	const busy = () =>
		watching.some((r) => {
			const query = cache.find({ queryKey: r.options.queryKey, exact: true });
			return query !== undefined && query.state.fetchStatus !== "idle";
		});
	if (!busy()) return Promise.resolve();
	return new Promise((resolve) => {
		const stop = cache.subscribe(() => {
			if (busy()) return;
			stop();
			resolve();
		});
	});
}

// What a read's `meta.reach` answers about its value: whether the server is
// out of reach.
export type Reach = (data: unknown) => boolean;

// `guardReach`: docs/architecture/plugins/query.md, "Acts".
export function guardReach(client: QueryClient): void {
	if (!onlineManager.isOnline()) throw new Unreached();
	for (const query of client.getQueryCache().getAll()) {
		const reach = query.meta?.reach as Reach | undefined;
		if (reach === undefined || query.state.data === undefined) continue;
		if (reach(query.state.data)) throw new Unreached();
	}
}
