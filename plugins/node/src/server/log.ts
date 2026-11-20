export interface ServiceLogger {
	info(message: string): void;
	error(message: string): void;
}

// The main listener's line once every port answers, which the dev process
// waits for (`readyPattern`): docs/architecture/plugins/node.md, "Dev". Plain
// text, so it reads as its own pattern.
export const READY_LINE = "slotform node: listening on";
