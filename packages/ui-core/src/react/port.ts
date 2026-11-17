// What the read hooks and the components ask of the binding that runs the reads: docs/architecture/ui-core/reads.md, "The port".
import {
	createContext,
	createElement,
	type ReactNode,
	use,
	useMemo,
} from "react";
import { type Issue, Unreached } from "../acts.ts";
import type {
	Can,
	InputOf,
	OutputOf,
	ProcedureCall,
	ProcedureSchema,
} from "../form.ts";
import type {
	More,
	Observed,
	Read,
	ReadAnswer,
	Selection,
	WindowState,
} from "../read.ts";

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
	/** The sentence a failed act's rejection reads as when the server worded it for the viewer; undefined for every other failure. */
	refusal: (error: unknown) => string | undefined;
	/** Whether a failed act is worth running again as it stands. */
	retries: (error: unknown) => boolean;
	/** What the procedure's input schema refused in a rejection, each issue with the path of its value; none for any other failure. */
	issues: (error: unknown) => readonly Issue[];
	/** The call that submits the procedure's input, its run followed by the binding (dev checks, invalidation); `act` may be undefined so the hook's count stays fixed. A hook. */
	useSubmit: <P extends ProcedureCall>(
		act: P | undefined,
	) => (input: InputOf<P>) => Promise<OutputOf<P>>;
	/** The procedure's entry in the generated schema by its dotted path, or undefined before the first `stack generate`. */
	schemaOf: (path: string) => ProcedureSchema | undefined;
	/** Whether the caller may do the action on the subject in the organization (none answers no), as a selection that paints while the caller's rules load. */
	may: (organizationId: string | undefined, can: Can) => Selection<boolean>;
	/** Starts the reads a route file's `preload` export names, given the route's params; a route file with none starts nothing. */
	warm: (route: object, params: object) => void;
}

// A member asked for what only a binding has.
function unbound(what: string): never {
	throw new Error(
		`${what} needs the query binding: wrap the app in \`QueryProvider\` from \`@fcalell/plugin-query/tanstack-query\`.`,
	);
}

const NO_ANSWERS: readonly ReadAnswer[] = [];

// The port with no binding mounted: docs/architecture/ui-core/reads.md, "The port".
const UNBOUND: ReadPort = {
	useReads<R>(
		observed: readonly Observed[],
		combine?: (answers: readonly ReadAnswer[]) => R,
	): R {
		const [first] = observed;
		if (first) unbound(`The read ${first.read.key}`);
		// Without `combine`, `R` is its default, the answers.
		return useMemo(
			() => (combine ? combine(NO_ANSWERS) : NO_ANSWERS) as R,
			[combine],
		);
	},
	fetchingNext: (read) => unbound(`The read ${read.key}`),
	retry: (read) => unbound(`The read ${read.key}`),
	useNextPage: (read) => unbound(`The read ${read.key}`),
	useWindowState: (read) =>
		read ? unbound(`The read ${read.key}`) : { state: undefined, kept: false },
	ensurePages: (read) => unbound(`The read ${read.key}`),
	settled: (reads) => {
		const [first] = reads;
		return first ? unbound(`The read ${first.key}`) : Promise.resolve();
	},
	act: (onAct) => onAct(),
	carry: (children) => children,
	refusal: () => undefined,
	retries: (error) => !(error instanceof Unreached),
	issues: () => [],
	useSubmit: () => () => unbound("A Form's procedure"),
	schemaOf: (path) => unbound(`The schema of ${path}`),
	may: (_organizationId, can) => unbound(`The ability to ${can.join(" ")}`),
	warm: () => {},
};

const ReadPortContext = createContext<ReadPort>(UNBOUND);

/** Puts the port in reach of every hook below it. */
export function PortProvider(props: { port: ReadPort; children?: ReactNode }) {
	return createElement(ReadPortContext, { value: props.port }, props.children);
}

/** The port the provider above holds, or the one with no binding. */
export function usePort(): ReadPort {
	return use(ReadPortContext);
}
