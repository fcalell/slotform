export type {
	AppConfig,
	ExtractPlugin,
	PluginConfig,
	SlotformConfig,
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
export { GENERATED_DIR } from "./lib/generated-dir.ts";
export { slotformSpec } from "./lib/slotform-packages.ts";
export type {
	Contribution,
	Slot,
	SlotKind,
} from "./lib/slots.ts";
export { slot } from "./lib/slots.ts";
