import { pluginPackage } from "../lib/first-party.ts";
import { toCamelCase } from "../lib/naming.ts";

interface SlotformConfigOptions {
	name: string;
	domain: string;
	plugins: string[];
	pluginAnswers: Map<string, Record<string, unknown>>;
}

export function slotformConfigTemplate(options: SlotformConfigOptions): string {
	const imports = ['import { defineConfig } from "@slotform/cli";'];

	for (const name of options.plugins) {
		const id = toCamelCase(name);
		imports.push(`import { ${id} } from "${pluginPackage(name)}";`);
	}

	const pluginCalls: string[] = [];
	for (const name of options.plugins) {
		const id = toCamelCase(name);
		const answers = options.pluginAnswers.get(name);
		// JSON is a TypeScript literal; init's format pass lays it out.
		const args =
			answers && Object.keys(answers).length > 0
				? JSON.stringify(answers, null, "\t").replaceAll("\n", "\n\t\t")
				: "";
		pluginCalls.push(`\t\t${id}(${args})`);
	}

	const lines: string[] = [];
	lines.push("");
	lines.push("export default defineConfig({");
	lines.push("\tapp: {");
	lines.push(`\t\tname: ${JSON.stringify(options.name)},`);
	lines.push(`\t\tdomain: ${JSON.stringify(options.domain)},`);
	lines.push("\t},");
	lines.push("\tplugins: [");
	lines.push(...pluginCalls.map((call) => `${call},`));
	lines.push("\t],");
	lines.push("});");
	lines.push("");

	return `${imports.join("\n")}\n${lines.join("\n")}`;
}
