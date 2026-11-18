/// <reference path="./virtual.d.ts" />

// Siblings by package name, never relative: docs/architecture/plugins/query.md, "Source shipping".
import { SCHEMA } from "virtual:stack-schema";
import type { MongoAbility } from "@casl/ability";
import { registerOperationContext } from "@fcalell/plugin-api/client";
import {
	type EntityName,
	handleMutationSuccess,
} from "@fcalell/plugin-api/query-invalidation";
import type {
	RouterClient,
	ScopedRouterClient,
} from "@fcalell/plugin-api/types";
import {
	ability,
	composeAbility,
	orgRules,
	type PackedRulesLike,
} from "@fcalell/plugin-query/ability-client";
import {
	guardReach,
	heldAct,
	issues,
	type Reach,
	refusal,
	retries,
	watchActs,
	whenSettled,
} from "@fcalell/plugin-query/acts";
import { listenQueries } from "@fcalell/plugin-query/listen";
import {
	ensurePages,
	retryOnce,
	watchUnheld,
	withHold,
	withRead,
} from "@fcalell/plugin-query/read";
import { scoped as scopedBy, withScope } from "@fcalell/plugin-query/scope";
import type { InputOf, OutputOf, ProcedureCall } from "@fcalell/ui-core/form";
import type { QueryListeners } from "@fcalell/ui-core/listen";
import { PortProvider, type ReadPort } from "@fcalell/ui-core/react/port";
import {
	type Observed,
	planSelections,
	type QueryOf,
	type Read,
	type ReadAnswer,
	type Selection,
	type WindowState,
} from "@fcalell/ui-core/read";
import type { ScopeIds } from "@fcalell/ui-core/scope";
import {
	createTanstackQueryUtils,
	OPERATION_CONTEXT_SYMBOL,
} from "@orpc/tanstack-query";
import {
	keepPreviousData,
	MutationCache,
	QueryClient,
	type QueryClientConfig,
	QueryClientProvider,
	type SkipToken,
	skipToken,
	type UseInfiniteQueryOptions,
	type UseMutationOptions,
	type UseQueryOptions,
	useInfiniteQuery,
	useMutation,
	useQueries,
	useQuery,
} from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useState } from "react";

export {
	experimental_streamedQuery as streamedQuery,
	QueryClient,
	QueryClientProvider,
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";

// Declared reads of a query outside the API: docs/architecture/plugins/api.md, "Cache invalidation".
declare module "@tanstack/react-query" {
	interface Register {
		queryMeta: {
			reads?: readonly EntityName[];
			// How much longer a first load's data waits, set once on the client's
			// default query meta by `QueryProvider`.
			hold?: (elapsed: number) => number;
			// Says from the read's value whether the server is out of reach
			// (`guardReach` in `@fcalell/plugin-query/acts`).
			reach?: Reach;
		} & Record<string, unknown>;
	}
}

// The defaults on every platform: a single retry of a failure that may pass (a
// flaky connection should not hammer the worker) and a 30 s freshness window,
// so moving between screens does not refetch on every mount.
const DEFAULTS: QueryClientConfig = {
	defaultOptions: {
		queries: {
			retry: retryOnce,
			staleTime: 30_000,
		},
	},
};

// Auto-invalidation on mutation success: docs/architecture/plugins/query.md, "Cache invalidation".
function createAutoInvalidationMutationCache(
	getQueryClient: () => QueryClient,
): MutationCache {
	return new MutationCache({
		onMutate: () => guardReach(getQueryClient()),
		onSuccess: (_data, _variables, _onMutateResult, mutation) => {
			if (mutation.meta?.skipAutoInvalidation) return;
			handleMutationSuccess(getQueryClient(), mutation.options.mutationKey);
		},
	});
}

export function createQueryClient(config?: QueryClientConfig): QueryClient {
	const queryClient: QueryClient = new QueryClient({
		...DEFAULTS,
		...config,
		defaultOptions: {
			...DEFAULTS.defaultOptions,
			...config?.defaultOptions,
			queries: {
				...DEFAULTS.defaultOptions?.queries,
				...config?.defaultOptions?.queries,
			},
		},
		mutationCache:
			config?.mutationCache ??
			createAutoInvalidationMutationCache(() => queryClient),
	});

	return queryClient;
}

// `.read`, `.pages` and `.window` on every procedure's utils: docs/architecture/plugins/query.md, "Reads".
type Page<T> = { data: T[]; nextCursor: string | null };
type Windowed<T> = { data: T[]; total: number; offset: number };
type ReadsOf<C> = C extends (...a: infer A) => Promise<infer O>
	? {
			read(...a: { [K in keyof A]: A[K] | SkipToken }): Read<O>;
		} & (O extends Page<infer T>
			? {
					pages(
						input: Omit<A[0], "cursor"> | SkipToken,
					): Read<T[], QueryOf<A[0]>>;
				}
			: unknown) &
			(O extends Windowed<infer T>
				? {
						window(
							input: Omit<A[0], "offset"> | SkipToken,
						): Read<T[], QueryOf<A[0]>>;
					}
				: unknown)
	: { [K in keyof C]: ReadsOf<C[K]> };

export type ApiQueryUtils<TRouter> = ReturnType<
	typeof createTanstackQueryUtils<ScopedRouterClient<TRouter>>
> &
	ReadsOf<ScopedRouterClient<TRouter>>;

// Wrap a typed oRPC client with TanStack Query helpers (`.queryOptions`,
// `.mutationOptions`, `.infiniteOptions`, and `.read`). The native analog of
// `createClient` from `@fcalell/plugin-api/client` — same router-typed surface,
// query-shaped. The client sends a query these utils make as GET: it learns the
// operation context's symbol here, from the copy of `@orpc/tanstack-query` the
// utils are.
export function createApiQueryUtils<TRouter>(
	client: RouterClient<TRouter>,
): ApiQueryUtils<TRouter> {
	registerOperationContext(OPERATION_CONTEXT_SYMBOL);
	return withRead(
		withScope(createTanstackQueryUtils(client), SCHEMA),
		SCHEMA,
	) as ApiQueryUtils<TRouter>;
}

/** `scoped` from `@fcalell/plugin-query/scope`, over the app's schema. */
export function scoped<U>(utils: U, scope: ScopeIds): U {
	return scopedBy(utils, scope, SCHEMA);
}

// A read's options as an observer takes them: a painted read's carry the
// stand-in that marks the observer, a silent one's notify on nothing.
const optionsOf = (o: Observed): Read<unknown>["options"] => ({
	...o.read.options,
	...(o.standIn && { placeholderData: o.standIn }),
	...(o.silent && { notifyOnChangeProps: [] }),
});

const IDLE = {
	queryKey: ["stack", "window", "idle"] as readonly unknown[],
	queryFn: skipToken,
};

// The port over one query client: each member that is a hook is TanStack's
// hook given that client, so a read observes, and a submit runs in, the
// provider's cache wherever its hook renders.
function readPort(client: QueryClient): ReadPort {
	return {
		useReads<R>(
			observed: readonly Observed[],
			combine?: (answers: readonly ReadAnswer[]) => R,
		): R {
			return useQueries({ queries: observed.map(optionsOf), combine }, client);
		},
		fetchingNext(read) {
			return (
				client.getQueryCache().find({ queryKey: read.options.queryKey })?.state
					.fetchMeta?.fetchMore?.direction === "forward"
			);
		},
		retry(read) {
			return client.refetchQueries({
				queryKey: read.options.queryKey,
				exact: true,
			});
		},
		// An infinite observer that never fetches by mounting (`enabled: false`).
		useNextPage(read) {
			const query = useInfiniteQuery(
				{
					...(read.options as UseInfiniteQueryOptions),
					enabled: false,
				},
				client,
			);
			return {
				next: query.hasNextPage,
				fetching: query.isFetchingNextPage,
				failed: query.isFetchNextPageError,
				fetch: () => query.fetchNextPage(),
			};
		},
		useWindowState(read) {
			const query = useQuery(
				{
					...((read?.options ?? IDLE) as UseQueryOptions),
					enabled: false,
					placeholderData: keepPreviousData,
				},
				client,
			);
			return {
				state: query.data as WindowState | undefined,
				kept: query.isPlaceholderData,
			};
		},
		ensurePages(read, pages) {
			return ensurePages(client, read, pages);
		},
		settled(reads) {
			return whenSettled(client.getQueryCache(), reads);
		},
		act(onAct) {
			return heldAct(client.getMutationCache(), onAct);
		},
		carry(children) {
			return (
				<QueryClientProvider client={client}>{children}</QueryClientProvider>
			);
		},
		refusal,
		retries,
		issues,
		useSubmit<P extends ProcedureCall>(act: P | undefined) {
			const mutation = useMutation(
				// The utils' `mutationOptions()` is typed by its procedure, which the
				// structural `ProcedureCall` does not carry.
				(act?.mutationOptions() ?? {}) as UseMutationOptions<
					OutputOf<P>,
					Error,
					InputOf<P>
				>,
				client,
			);
			return mutation.mutateAsync;
		},
		schemaOf(path) {
			return SCHEMA[path];
		},
		may(organizationId, can) {
			return ability(organizationId).at((rules) => rules.can(can[0], can[1]));
		},
		// A route file's `preload` export takes the client and the route's params.
		warm(route, params) {
			if (!("preload" in route)) return;
			const { preload } = route;
			if (typeof preload === "function") preload(client, params);
		},
	};
}

export interface QueryProviderProps {
	client?: QueryClient;
	// How the online and focus managers learn their state, where the platform
	// has no window events (the phone). The web passes nothing.
	listen?: QueryListeners;
	// The minimum hold on a read's first write, given the ms since its fetch
	// began (`holdOf` in `./read.ts`); a UI plugin passes it from its timings.
	hold?: (elapsed: number) => number;
	children: ReactNode;
}

// The provider the app root is wrapped with: docs/architecture/plugins/query.md, "Contributions".
export function QueryProvider(props: QueryProviderProps) {
	const [client] = useState(() =>
		withHold(props.client ?? createQueryClient(), props.hold),
	);
	const [port] = useState(() => readPort(client));
	const { listen } = props;
	useEffect(() => (listen ? listenQueries(listen) : undefined), [listen]);
	useEffect(() => watchUnheld(client.getQueryCache()), [client]);
	useEffect(() => watchActs(client.getMutationCache()), [client]);
	return (
		<QueryClientProvider client={client}>
			<PortProvider port={port}>{props.children}</PortProvider>
		</QueryClientProvider>
	);
}

// The app's own subscription to a selection: real data, or `undefined` while
// the read waits, is idle or failed. The stand-in never reaches app code.
export function useRead<T>(selection: Selection<T>): T | undefined {
	const plan = useMemo(() => planSelections([selection]), [selection]);
	const combine = useMemo(
		() => (results: Parameters<typeof plan.draw>[0]) => {
			const [drawn] = plan.draw(results);
			return drawn?.painted ? undefined : (drawn?.value as T);
		},
		[plan],
	);
	return useQueries({
		queries: plan.reads.map((r) => r.options),
		combine,
	});
}

// Org-level authority everywhere, layered with a `PackedRules` field off any
// query the caller already has (`useAbility(orgId, query.data.rules)`).
// Deny-all while the org rules are loading or errored (`composeAbility` treats
// "no org rules and no record rules" as deny-all); a record layer passed in
// that window still answers its own checks, since it is real data the caller
// already has.
export function useAbility(
	organizationId: string | undefined,
	recordRules?: PackedRulesLike,
): MongoAbility {
	const rules = useRead(
		useMemo(() => orgRules(organizationId), [organizationId]),
	);
	return composeAbility(rules, recordRules);
}
