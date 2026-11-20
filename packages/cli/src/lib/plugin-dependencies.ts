import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { cliSlots } from "./cli-slots.ts";
import { SlotformError } from "./errors.ts";
import type { Graph } from "./graph.ts";
import { namedSlotformPackages } from "./install.ts";
import { readManifest } from "./manifest.ts";
import { installedRoot } from "./package-info.ts";
import {
	isSlotformPackage,
	type SlotformPackage,
	slotformClosure,
	slotformPluginSpecs,
} from "./slotform-packages.ts";

interface PluginDependencies {
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
}

const peerManifestSchema = z.object({
	name: z.string(),
	peerDependencies: z.record(z.string(), z.string()).optional(),
	peerDependenciesMeta: z
		.record(z.string(), z.object({ optional: z.boolean().optional() }))
		.optional(),
});

type PeerManifest = z.infer<typeof peerManifestSchema>;

// The dependencies `slotform init` and `slotform add` write: docs/architecture/consumer-project.md, "Installing Slotform".
// Runs after the install, since the peers are read off the installed Slotform
// packages; `patchPackageJson` keeps what the app's `package.json` declares.
export async function pluginDependencies(
	graph: Graph,
	plugins: readonly string[],
	dir: string,
): Promise<PluginDependencies> {
	const [deps, devDependencies] = await Promise.all([
		graph.resolve(cliSlots.initDeps),
		graph.resolve(cliSlots.initDevDeps),
	]);
	const peers = requiredPeers(appClosureManifests(dir), {
		...deps,
		...devDependencies,
	});
	return {
		dependencies: { ...peers, ...deps, ...slotformPluginSpecs(plugins) },
		devDependencies,
	};
}

// Every required third-party peer of `manifests` that `explicit` does not
// name, the first manifest's range where two name it.
export function requiredPeers(
	manifests: readonly PeerManifest[],
	explicit: Readonly<Record<string, string>>,
): Record<string, string> {
	const peers: Record<string, string> = {};
	for (const manifest of manifests) {
		for (const [name, range] of Object.entries(
			manifest.peerDependencies ?? {},
		)) {
			if (manifest.peerDependenciesMeta?.[name]?.optional) continue;
			if (isSlotformPackage(name)) continue;
			if (Object.hasOwn(explicit, name) || Object.hasOwn(peers, name)) continue;
			peers[name] = range;
		}
	}
	return peers;
}

// The required peers `manifests` hold that `remaining` no longer require: the
// ones `slotform remove` prunes.
export function droppedPeers(
	manifests: readonly PeerManifest[],
	remaining: readonly PeerManifest[],
): string[] {
	const kept = requiredPeers(remaining, {});
	return Object.keys(requiredPeers(manifests, {})).filter(
		(name) => !Object.hasOwn(kept, name),
	);
}

// The installed manifest of every Slotform package in the closure of those the
// app at `dir` names in its `package.json`, `without` left out of the named.
export function appClosureManifests(
	dir: string,
	without: readonly string[] = [],
): PeerManifest[] {
	const named = namedSlotformPackages(
		readManifest(join(dir, "package.json")),
	).filter((name) => !without.includes(name));
	return installedManifests(dir, slotformClosure(named));
}

// The manifest of each of `names` as installed under the app at `dir`. pnpm
// links only the app's own dependencies at its root, so a package the closure
// reaches is found beside the real directory of a package found before it.
function installedManifests(
	dir: string,
	names: readonly SlotformPackage[],
): PeerManifest[] {
	const roots: string[] = [];
	let pending = [...names];
	while (pending.length > 0) {
		const from = [dir, ...roots];
		const left: SlotformPackage[] = [];
		for (const name of pending) {
			const root = from
				.map((base) => installedRoot(name, base))
				.find((r) => r !== null);
			if (root === undefined) left.push(name);
			else roots.push(root);
		}
		if (left.length === pending.length) {
			throw new SlotformError(
				`${left.join(", ")} not installed under ${dir}: run pnpm install, then retry.`,
				"NOT_INSTALLED",
			);
		}
		pending = left;
	}
	return roots.map((root) =>
		peerManifestSchema.parse(
			JSON.parse(readFileSync(join(root, "package.json"), "utf8")),
		),
	);
}
