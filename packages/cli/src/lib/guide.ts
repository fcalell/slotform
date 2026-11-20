import type { GuideEntry } from "../specs.ts";
import { GENERATED_DIR } from "./generated-dir.ts";

export const GUIDE_PATH = `${GENERATED_DIR}/guide.md`;

// The CLI's own pages, beside the plugins' in `cliSlots.guide`.
export const cliGuide: readonly { page: string; trigger: string }[] = [
	{
		page: "provided",
		trigger: "Shaping, scoping or estimating a feature",
	},
	{
		page: "config",
		trigger: "Adding a plugin or changing an option in `slotform.config.ts`",
	},
	{
		page: "commands",
		trigger:
			"Running a `slotform` command, or deciding which one a change needs",
	},
	{
		page: "shortfall",
		trigger:
			"A part the app needs that Slotform lacks: a component, variant, token, option or procedure feature",
	},
];

// Renders `.slotform/guide.md`: docs/architecture/consumer-project.md, "The guide".
export function renderGuide(entries: readonly GuideEntry[]): string {
	const domains = new Map<string, string[]>();
	const seen = new Set<string>();
	for (const e of entries) {
		const key = `${e.package}/${e.page}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const lines = domains.get(e.domain) ?? [];
		lines.push(`- ${e.trigger} → node_modules/${e.package}/guide/${e.page}.md`);
		domains.set(e.domain, lines);
	}
	const sections = [...domains].map(
		([domain, lines]) => `## ${domain}\n\n${lines.join("\n")}\n`,
	);
	return [
		"Slotform's guide at this project's pin: each line says when to open a page, then the page. Open only the page the step in hand needs.\n",
		...sections,
	].join("\n");
}
