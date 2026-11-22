// The public packages: docs/architecture/releasing.md, "What is published".

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export interface PublicPackage {
	// Relative to the repo root, as a pnpm `--filter` takes it: `./plugins/db`.
	dir: string;
	name: string;
	version: string;
}

export const ROOT = resolve(import.meta.dirname, "..");

// A directory with no manifest is no package; a `private` one (repo-checks) is never published,
// and pnpm's filters cannot select on `private`.
export function publicPackages(): PublicPackage[] {
	return ["packages", "plugins"].flatMap((group) =>
		readdirSync(join(ROOT, group)).flatMap((name) => {
			const dir = `./${group}/${name}`;
			const path = join(ROOT, dir, "package.json");
			if (!existsSync(path)) return [];
			const manifest = JSON.parse(readFileSync(path, "utf8")) as {
				name: string;
				version: string;
				private?: boolean;
			};
			return manifest.private
				? []
				: [{ dir, name: manifest.name, version: manifest.version }];
		}),
	);
}
