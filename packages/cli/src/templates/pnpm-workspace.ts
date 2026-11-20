import { parseDocument } from "yaml";
import {
	STACK_PACKAGES,
	type StackPackage,
	stackClosure,
} from "../lib/stack-packages.ts";

// Merges stack's install settings into `pnpm-workspace.yaml`: docs/architecture/consumer-project.md, "Installing stack".
export function pnpmWorkspaceTemplate(
	existing: string | null,
	packages: Iterable<StackPackage>,
): string {
	const doc = parseDocument(existing ?? "");
	const builds: Record<string, boolean> = {};
	for (const name of stackClosure(packages)) {
		const entry = STACK_PACKAGES[name];
		const verdicts: Readonly<Record<string, boolean>> =
			"builds" in entry ? entry.builds : {};
		for (const [dep, allowed] of Object.entries(verdicts)) {
			if (builds[dep] === !allowed) {
				throw new Error(`Stack packages disagree on the build of ${dep}.`);
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
