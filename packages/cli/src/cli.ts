#!/usr/bin/env node
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { log } from "@clack/prompts";
import {
	DEFAULT_CONFIG,
	findPluginCommand,
	flagList,
	GLOBAL_OPTIONS,
	parseCommandFlags,
} from "./lib/command-router.ts";
import { ConfigValidationError } from "./lib/errors.ts";

// `strict: false` lets plugin-subcommand flags (e.g. `stack db apply --remote`)
// pass through top-level parsing without an "unknown option" error; the
// command router then parses them from argv. With `strict: false`, `values`
// is typed as `{ [k: string]: undefined | string | boolean | (string|boolean)[] }`,
// so every access narrows with `typeof`.
const { positionals, values } = parseArgs({
	allowPositionals: true,
	strict: false,
	options: {
		...GLOBAL_OPTIONS,
		plugins: { type: "string" },
		domain: { type: "string" },
		package: { type: "string" },
		dir: { type: "string" },
		yes: { type: "boolean", short: "y", default: false },
		force: { type: "boolean", default: false },
	},
});

const command = positionals[0];
const subcommand = positionals[1];
const string = (value: unknown) =>
	typeof value === "string" ? value : undefined;
const configPath = string(values.config) ?? DEFAULT_CONFIG;
// The process entry's one read of the environment: docs/architecture/conventions.md, "The environment".
const env = process.env;

function required(name: string | undefined, usage: string): string {
	if (name) return name;
	log.error(`Usage: ${usage}`);
	process.exit(1);
}

const PLUGIN_USAGE =
	"stack plugin init <name> [--package <npm-name>] [--dir <path>]";

interface CoreCommand {
	usage: string;
	summary: string;
	// What `stack <command> --help` adds below the usage; the summary otherwise.
	help?: string;
	run(): Promise<void>;
}

const COMMANDS: Record<string, CoreCommand> = {
	init: {
		usage: "stack init [dir] [--plugins <csv>] [--domain <d>] [-y] [--force]",
		summary: "Scaffold a new project",
		help: "Scaffold a new project in [dir]. Without a terminal, [dir] is required.\n  --force scaffolds into a directory that already has a project.",
		run: async () => {
			const { init } = await import("./commands/init.ts");
			await init(subcommand ? resolve(subcommand) : process.cwd(), {
				plugins: string(values.plugins)
					?.split(",")
					.map((s) => s.trim())
					.filter((s) => s.length > 0),
				domain: string(values.domain),
				yes: values.yes === true,
				force: values.force === true,
				dirGiven: subcommand !== undefined,
				env,
			});
		},
	},
	add: {
		usage: "stack add <plugin> [-y]",
		summary: "Add a plugin",
		help: "Add a plugin. -y replaces a displaced plugin's files without asking.",
		run: async () => {
			const name = required(subcommand, "stack add <plugin>");
			const { add } = await import("./commands/add.ts");
			await add(name, configPath, { yes: values.yes === true, env });
		},
	},
	remove: {
		usage: "stack remove <plugin> [-y]",
		summary: "Remove a plugin",
		help: "Remove a plugin. Lists the files it deletes and asks; -y skips the\n  question (required without a terminal).",
		run: async () => {
			const name = required(subcommand, "stack remove <plugin>");
			const { remove } = await import("./commands/remove.ts");
			await remove(name, configPath, { yes: values.yes === true, env });
		},
	},
	generate: {
		usage: "stack generate",
		summary: "Generate .stack/ files",
		run: async () => {
			const { generate } = await import("./commands/generate.ts");
			await generate(configPath, env);
		},
	},
	dev: {
		usage: "stack dev",
		summary: "Start development",
		run: async () => {
			const { dev } = await import("./commands/dev.ts");
			await dev({ config: configPath, env });
		},
	},
	build: {
		usage: "stack build",
		summary: "Build for production",
		run: async () => {
			const { build } = await import("./commands/build.ts");
			await build(configPath, env);
		},
	},
	deploy: {
		usage: "stack deploy",
		summary: "Deploy to production",
		run: async () => {
			const { deploy } = await import("./commands/deploy.ts");
			await deploy({ config: configPath, env });
		},
	},
	link: {
		usage: "stack link <checkout>",
		summary: "Install stack from a checkout",
		help: "Install every stack package of the app from the stack checkout at <checkout>,\n  which is built first. Run it again after a rebuild; `stack unlink` undoes it.",
		run: async () => {
			const checkout = required(subcommand, "stack link <checkout>");
			const { link } = await import("./commands/link.ts");
			link(process.cwd(), resolve(checkout), env);
		},
	},
	unlink: {
		usage: "stack unlink",
		summary: "Install stack from the lockfile again",
		run: async () => {
			const { unlink } = await import("./commands/link.ts");
			unlink(process.cwd(), env);
		},
	},
	// `stack plugin init` is handled ahead of plugin routing: docs/architecture/commands.md, "Plugin subcommands".
	plugin: {
		usage: PLUGIN_USAGE,
		summary: "Scaffold a third-party plugin skeleton",
		run: async () => {
			if (subcommand !== "init") {
				log.error(
					`Unknown plugin command: "${subcommand ?? ""}". Usage: ${PLUGIN_USAGE}`,
				);
				process.exit(1);
			}
			const name = required(positionals[2], PLUGIN_USAGE);
			const { initPlugin } = await import("./commands/plugin.ts");
			await initPlugin({
				name,
				package: string(values.package),
				dir: string(values.dir),
			});
		},
	},
};

const COLUMN = 40;
const USAGE = `Usage:
${Object.values(COMMANDS)
	.map(({ usage, summary }) => {
		const line = `  ${usage}`;
		return line.length < COLUMN
			? line.padEnd(COLUMN) + summary
			: `${line}\n${" ".repeat(COLUMN)}${summary}`;
	})
	.join("\n")}

Flags: -h/--help, --config <path>, --debug (stack traces)`;

function usage(): never {
	log.info(USAGE);
	process.exit(1);
}

async function main(): Promise<void> {
	if (!command) {
		if (values.help === true) {
			log.info(USAGE);
			process.exit(0);
		}
		usage();
	}

	const core = Object.hasOwn(COMMANDS, command) ? COMMANDS[command] : undefined;
	if (core) {
		if (values.help === true) {
			log.info(`Usage:\n  ${core.usage}\n  ${core.help ?? core.summary}`);
			process.exit(0);
		}
		await core.run();
		return;
	}

	const pluginName = command;
	const commandName = subcommand;
	if (!commandName) usage();

	const { loadConfig } = await import("./lib/config.ts");
	const { buildGraphFromConfig } = await import("./lib/build-graph.ts");
	const { generate } = await import("./commands/generate.ts");
	const { createLogContext, createPromptContext } = await import(
		"./lib/prompt.ts"
	);

	const config = await loadConfig(configPath);
	const { graph, plugins } = await buildGraphFromConfig({
		config,
		cwd: process.cwd(),
		env,
	});

	const pluginClis = plugins.map((p) => p.cli);
	const match = findPluginCommand(pluginClis, pluginName, commandName);

	if (!match) {
		log.error(`Unknown command: stack ${pluginName} ${commandName}`);
		usage();
	}

	if (values.help === true) {
		log.info(
			`Usage:\n  stack ${pluginName} ${commandName}\n  ${match.command.description}\n  Flags: ${flagList(match.command)}`,
		);
		process.exit(0);
	}

	const flags = parseCommandFlags(match.command, process.argv.slice(2));
	const plugin = plugins.find((p) => p.name === pluginName);

	// `generate` is the call `stack generate` makes, so a command's
	// regeneration and the CLI's never differ.
	const cwd = process.cwd();
	await match.command.handler(
		{
			options: plugin?.options ?? {},
			cwd,
			env,
			resolve: graph.resolve,
			generate: () => generate(configPath, env),
			log: createLogContext(),
			prompt: createPromptContext(),
		},
		flags,
	);
}

try {
	await main();
} catch (error) {
	if (error instanceof ConfigValidationError) {
		for (const err of error.errors) {
			log.error(
				`[${err.plugin}] ${err.message}${err.fix ? ` — ${err.fix}` : ""}`,
			);
		}
		process.exit(1);
	}
	if (error instanceof Error) {
		const flag = env.STACK_DEBUG;
		const debug =
			values.debug === true || (!!flag && flag !== "0" && flag !== "false");
		log.error(debug ? (error.stack ?? error.message) : error.message);
	} else {
		log.error(String(error));
	}
	process.exit(1);
}
