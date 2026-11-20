// The React Compiler's source filters: docs/architecture/plugins/react.md, "React Compiler".
export const OTHER_DEPENDENCY =
	"/node_modules/(?!\\.pnpm/@slotform\\+|@slotform/)";
export const COMPILED_SOURCE = `^(?:(?!${OTHER_DEPENDENCY}).)*$`;
