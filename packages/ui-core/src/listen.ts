// What the query client's online and focus managers listen to, given by a UI
// plugin whose platform has no window events (the phone: the network and the
// app's foreground). Each takes the manager's setter and returns its cleanup.
export interface QueryListeners {
	online?: (set: (online: boolean) => void) => () => void;
	focus?: (set: (focused: boolean) => void) => () => void;
}
