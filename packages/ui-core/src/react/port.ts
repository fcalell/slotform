// What the read hooks ask of the binding that runs the reads
// (`@fcalell/plugin-query`), which provides it around the app. The members that
// observe are hooks themselves, called at the hook's top level in a fixed
// order; the others are plain calls. One port per provider: its identity is
// stable for the provider's life.
import { createContext, createElement, type ReactNode, use } from "react";
import type { More, Observed, Read, ReadAnswer, WindowState } from "../read.ts";

export interface ReadPort {
	/** Observes the reads as one subscription: `combine` maps their answers, in order, to what the hook draws, and the hook renders when that result changes. Without `combine`, the answers. A hook. */
	useReads: <R = readonly ReadAnswer[]>(
		observed: readonly Observed[],
		combine?: (answers: readonly ReadAnswer[]) => R,
	) => R;
	/** Whether the read's fetch running now is its next page's. */
	fetchingNext: (read: Read<unknown>) => boolean;
	/** Fetches the read again; settles when the refetch does. */
	retry: (read: Read<unknown>) => Promise<unknown>;
	/** A pages read's next page, observed without fetching by mounting. A hook. */
	useNextPage: (read: Read<unknown>) => More;
	/** A window read's state, and whether it is the previous query's, kept until the new one has a first page; it never fetches by mounting. A hook. */
	useWindowState: (read: Read<unknown> | undefined) => {
		state: WindowState | undefined;
		kept: boolean;
	};
	/** Loads the window read's pages numbered that are not loaded, each once; rejects when one failed. */
	ensurePages: (read: Read<unknown>, pages: readonly number[]) => Promise<void>;
	/** Resolves once the fetches of these reads are over. */
	settled: (reads: readonly Read<unknown>[]) => Promise<void>;
	/** Calls an act's `onAct` and returns what it returns; in dev, names a mutation the call started and returned no promise for. */
	act: (onAct: () => unknown) => unknown;
	/** The binding's own context around a tree drawn outside its provider (a native sheet's portal). */
	carry: (children: ReactNode) => ReactNode;
}

export const ReadPortContext = createContext<ReadPort | undefined>(undefined);

/** Puts the port in reach of every hook below it. */
export function PortProvider(props: { port: ReadPort; children?: ReactNode }) {
	return createElement(ReadPortContext, { value: props.port }, props.children);
}

/** The port the provider above holds; throws without one. */
export function usePort(): ReadPort {
	const port = use(ReadPortContext);
	if (!port) {
		throw new Error(
			"No read port: the read hooks run under the query provider (`QueryProvider` from `@fcalell/plugin-query/tanstack-query`).",
		);
	}
	return port;
}
