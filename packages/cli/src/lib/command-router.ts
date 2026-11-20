import { type ParseArgsOptionDescriptor, parseArgs } from "node:util";
import type { CommandDefinition, InternalCliPlugin } from "./create-plugin.ts";
import { SlotformError } from "./errors.ts";
import type { Slot } from "./slots.ts";

type AnyCliPlugin = InternalCliPlugin<
	unknown,
	Record<string, Slot<unknown>>,
	unknown
>;

type AnyCommand = CommandDefinition<unknown, Record<string, unknown>>;

interface PluginCommandMatch {
	plugin: AnyCliPlugin;
	command: AnyCommand;
	commandName: string;
}

export const DEFAULT_CONFIG = "slotform.config.ts";

// The flags every command takes, a plugin's own included: docs/architecture/commands.md, "Plugin subcommands".
export const GLOBAL_OPTIONS: Record<
	"config" | "help" | "debug",
	ParseArgsOptionDescriptor
> = {
	config: { type: "string", default: DEFAULT_CONFIG },
	help: { type: "boolean", short: "h", default: false },
	debug: { type: "boolean", default: false },
};

export function findPluginCommand(
	plugins: AnyCliPlugin[],
	pluginName: string,
	commandName: string,
): PluginCommandMatch | null {
	const plugin = plugins.find((p) => p.name === pluginName);
	if (!plugin || !Object.hasOwn(plugin.commands, commandName)) return null;
	const command = plugin.commands[commandName];
	if (!command) return null;

	return { plugin, command, commandName };
}

// A command's flags, as `--help` and an unknown flag's error list them.
export function flagList(command: AnyCommand): string {
	return (
		Object.entries(command.options ?? {})
			.map(([k, d]) => (d.alias ? `--${k} (-${d.alias})` : `--${k}`))
			.join(", ") || "(none)"
	);
}

export function parseCommandFlags(
	command: AnyCommand,
	argv: string[],
): Record<string, unknown> {
	const flags: Record<string, unknown> = {};
	const defs = command.options ?? {};

	// A one-character alias is a short flag; a longer one is a second long
	// name, an option of its own that folds into its key.
	const options: Record<string, ParseArgsOptionDescriptor> = {};
	const canonicalOf = new Map<string, string>();
	for (const [key, def] of Object.entries(defs)) {
		const type = def.type === "boolean" ? "boolean" : "string";
		options[key] = { type };
		canonicalOf.set(key, key);
		if (def.alias?.length === 1) {
			options[key].short = def.alias;
		} else if (def.alias) {
			options[def.alias] = { type };
			canonicalOf.set(def.alias, key);
		}
		if (def.default !== undefined) {
			flags[key] = def.default;
		} else if (def.type === "boolean") {
			flags[key] = false;
		}
	}
	// A global flag parses beside the command's own, so a string one takes its
	// value; a command flag of the same name or short letter wins.
	const shorts = new Set(Object.values(options).map((o) => o.short));
	for (const [name, { type, short }] of Object.entries(GLOBAL_OPTIONS)) {
		if (name in options) continue;
		options[name] =
			short !== undefined && !shorts.has(short) ? { type, short } : { type };
	}

	const { tokens = [] } = parseArgs({
		args: argv,
		options,
		strict: false,
		allowPositionals: true,
		tokens: true,
	});

	for (const token of tokens) {
		if (token.kind !== "option") continue;
		const canonical = canonicalOf.get(token.name);
		if (canonical === undefined && Object.hasOwn(GLOBAL_OPTIONS, token.name))
			continue;
		const def = canonical === undefined ? undefined : defs[canonical];
		if (canonical === undefined || def === undefined) {
			throw new SlotformError(
				`Unknown flag "${token.rawName}" for command "${command.description}". Available: ${flagList(command)}`,
				"UNKNOWN_FLAG",
			);
		}
		const { value } = token;
		if (def.type === "boolean") {
			if (value !== undefined) {
				throw new SlotformError(
					`Flag "${token.rawName}" takes no value.`,
					"INVALID_FLAG_VALUE",
				);
			}
			flags[canonical] = true;
		} else if (
			value === undefined ||
			(!token.inlineValue && value.startsWith("-"))
		) {
			throw new SlotformError(
				`Flag "${token.rawName}" requires a ${def.type} value.`,
				"MISSING_FLAG_VALUE",
			);
		} else if (def.type === "number") {
			const parsed = Number(value);
			if (value.trim() === "" || Number.isNaN(parsed)) {
				throw new SlotformError(
					`Flag "${token.rawName}" expects a number, got "${value}".`,
					"INVALID_FLAG_VALUE",
				);
			}
			flags[canonical] = parsed;
		} else {
			flags[canonical] = value;
		}
	}

	return flags;
}
