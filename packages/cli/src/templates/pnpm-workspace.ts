import { parseDocument } from "yaml";
import {
	SLOTFORM_PACKAGES,
	type SlotformPackage,
	slotformClosure,
} from "../lib/slotform-packages.ts";

// Merges Slotform's install settings into `pnpm-workspace.yaml`: docs/architecture/consumer-project.md, "Installing Slotform".
export function pnpmWorkspaceTemplate(
	existing: string | null,
	packages: Iterable<SlotformPackage>,
): string {
	const doc = parseDocument(existing ?? "");
	const builds: Record<string, boolean> = {};
	for (const name of slotformClosure(packages)) {
		const entry = SLOTFORM_PACKAGES[name];
		const verdicts: Readonly<Record<string, boolean>> =
			"builds" in entry ? entry.builds : {};
		for (const [dep, allowed] of Object.entries(verdicts)) {
			if (builds[dep] === !allowed) {
				throw new Error(`Slotform packages disagree on the build of ${dep}.`);
			}
			builds[dep] = allowed;
		}
	}
	for (const [dep, allowed] of Object.entries(builds)) {
		const path = ["allowBuilds", dep];
		if (!doc.hasIn(path)) doc.setIn(path, allowed);
	}
	return String(doc);
}
