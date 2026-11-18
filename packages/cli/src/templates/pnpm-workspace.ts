import { parseDocument } from "yaml";
import {
	STACK_PACKAGES,
	type StackPackage,
	stackBuildKey,
	stackGitSpec,
} from "../lib/stack-packages.ts";

// The given packages and every first-party package their `dependencies`
// reach, sorted by name.
function stackClosure(names: Iterable<StackPackage>): StackPackage[] {
	const seen = new Set<StackPackage>();
	const visit = (name: StackPackage): void => {
		if (seen.has(name)) return;
		seen.add(name);
		for (const dep of STACK_PACKAGES[name].dependencies) visit(dep);
	};
	for (const name of names) visit(name);
	return [...seen].sort();
}

// Each git package's `prepare` installs and builds the whole stack workspace
// in its own clone, so several at once can exhaust the machine's memory.
const THROTTLE: Record<string, number> = {
	childConcurrency: 1,
	networkConcurrency: 2,
};

// Merges stack's install settings into `pnpm-workspace.yaml`: docs/architecture/consumer-project.md, "Installing stack".
export function pnpmWorkspaceTemplate(
	existing: string | null,
	packages: Iterable<StackPackage>,
	git: boolean,
	commit: string | null,
): string {
	const doc = parseDocument(existing ?? "");
	const setMissing = (path: string[], value: unknown): void => {
		if (!doc.hasIn(path)) doc.setIn(path, value);
	};
	if (git) {
		for (const name of stackClosure(packages)) {
			setMissing(["overrides", name], stackGitSpec(name, commit));
		}
		// The git packages depend on one another by git spec.
		setMissing(["blockExoticSubdeps"], false);
	}
	const builds: Record<string, boolean> = {};
	for (const name of stackClosure(packages)) {
		if (git) setMissing(["allowBuilds", stackBuildKey(name)], true);
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
		setMissing(["allowBuilds", dep], allowed);
	}
	if (git) {
		for (const [name, value] of Object.entries(THROTTLE)) {
			setMissing([name], value);
		}
	}
	return String(doc);
}
