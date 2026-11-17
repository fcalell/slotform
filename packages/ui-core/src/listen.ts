// What the query client's online and focus managers listen to: docs/architecture/ui-core/reads.md, "The port".
export interface QueryListeners {
	online?: (set: (online: boolean) => void) => () => void;
	focus?: (set: (focused: boolean) => void) => () => void;
}
