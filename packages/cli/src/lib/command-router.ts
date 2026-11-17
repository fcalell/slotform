import { type ParseArgsOptionDescriptor, parseArgs } from "node:util";
import type { CommandDefinition, InternalCliPlugin } from "./create-plugin.ts";
import { StackError } from "./errors.ts";
import type { Slot } from "./slots.ts";

type AnyCliPlugin = InternalCliPlugin<
	unknown,
	Record<string, Slot<unknown>>,
	unknown
>;

interface PluginCommandMatch {
	plugin: AnyCliPlugin;
	command: CommandDefinition<unknown, Record<string, unknown>>;
	commandName: string;
}

export function findPluginCommand(
	plugins: AnyCliPlugin[],
	pluginName: string,
	commandName: string,
): PluginCommandMatch | null {
	const plugin = plugins.find((p) => p.name === pluginName);
	if (!plugin) return null;

	const command = plugin.commands[commandName];
	if (!command) return null;

	return { plugin, command, commandName };
}

export function parseCommandFlags(
	command: CommandDefinition<unknown, Record<string, unknown>>,
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

	const availableList =
		Object.entries(defs)
			.map(([k, d]) => (d.alias ? `--${k} (-${d.alias})` : `--${k}`))
			.join(", ") || "(none)";

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
		const def = canonical === undefined ? undefined : defs[canonical];
		if (canonical === undefined || def === undefined) {
			throw new StackError(
				`Unknown flag "${token.rawName}" for command "${command.description}". Available: ${availableList}`,
				"UNKNOWN_FLAG",
			);
		}
		const { value } = token;
		if (def.type === "boolean") {
			if (value !== undefined) {
				throw new StackError(
					`Flag "${token.rawName}" takes no value.`,
					"INVALID_FLAG_VALUE",
				);
			}
			flags[canonical] = true;
		} else if (
			value === undefined ||
			(!token.inlineValue && value.startsWith("-"))
		) {
			throw new StackError(
				`Flag "${token.rawName}" requires a ${def.type} value.`,
				"MISSING_FLAG_VALUE",
			);
		} else if (def.type === "number") {
			const parsed = Number(value);
			if (Number.isNaN(parsed)) {
				throw new StackError(
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
