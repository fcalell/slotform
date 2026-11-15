export type {
	AppConfig,
	ExtractPlugin,
	PluginConfig,
	StackConfig,
	ValidationError,
	ValidationResult,
} from "./config.ts";
export { defineConfig, getPlugin } from "./config.ts";
export type {
	CallbackMarker,
	CommandContext,
	CommandDefinition,
	ContributionCtx,
	FlagDefinition,
	InternalCliPlugin,
	OptionalCallbackMarker,
	PluginFactory,
} from "./lib/create-plugin.ts";
export { callback, plugin } from "./lib/create-plugin.ts";
export type {
	Contribution,
	Slot,
	SlotKind,
} from "./lib/slots.ts";
export { slot } from "./lib/slots.ts";
export { stackSpec } from "./lib/stack-packages.ts";
