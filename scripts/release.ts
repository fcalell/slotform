// The owner's release, one command: docs/procedures/publishing.md, "Steps".

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { publicPackages, ROOT } from "./public-packages.ts";

function stop(message: string): never {
	console.error(`\nrelease: ${message}`);
	process.exit(1);
}

function step(title: string): void {
	console.log(`\n== ${title}`);
}

// Runs with the terminal attached, so npm's one-time-password prompt reaches the owner.
function run(command: string, args: string[]): void {
	console.log(`$ ${command} ${args.join(" ")}`);
	const result = spawnSync(command, args, { cwd: ROOT, stdio: "inherit" });
	if (result.status !== 0)
		stop(`${command} ${args.join(" ")} exited ${result.status}`);
}

function output(command: string, args: string[]): string | undefined {
	const result = spawnSync(command, args, {
		cwd: ROOT,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});
	return result.status === 0 ? result.stdout.trim() : undefined;
}

// Every public package is at one version (`fixed` in `.changeset/config.json`).
function version(): string {
	const versions = new Set(publicPackages().map((p) => p.version));
	const [only] = versions;
	if (versions.size !== 1 || only === undefined)
		stop(`the public packages are at ${[...versions].join(", ")}`);
	return only;
}

// `npm view` fails for a version or a package npm lacks, so a registry it cannot reach reads as
// unpublished too, and the publish step then fails on it.
function unpublished(): string[] {
	return publicPackages()
		.filter(
			({ name, version }) =>
				output("npm", ["view", `${name}@${version}`, "version"]) !== version,
		)
		.map(({ name }) => name);
}

function tagOnOrigin(tag: string): boolean {
	return (
		(output("git", ["ls-remote", "--tags", "origin", `refs/tags/${tag}`]) ??
			"") !== ""
	);
}

step("Preflight");
if (output("git", ["branch", "--show-current"]) !== "master")
	stop("not on master");
if (output("git", ["status", "--porcelain"]) !== "")
	stop("the tree is not clean");
run("git", ["pull", "--ff-only"]);
if (output("npm", ["whoami"]) === undefined)
	stop("npm whoami failed: run npm login");

step("Install");
run("pnpm", ["install", "--frozen-lockfile"]);

step("Version");
const pending = readdirSync(join(ROOT, ".changeset")).filter(
	(file) => file.endsWith(".md") && file !== "README.md",
);
if (pending.length > 0) run("pnpm", ["changeset", "version"]);
const tag = `v${version()}`;
if (pending.length > 0) {
	run("git", ["add", "-A"]);
	run("git", ["commit", "-m", `chore: release ${tag}`]);
}
const published = unpublished().length === 0;
if (published && tagOnOrigin(tag))
	stop(
		`${tag} is on npm and origin and no changeset is pending: nothing to release`,
	);
console.log(published ? `${tag} is on npm: recording it` : `Releasing ${tag}`);

if (!published) {
	step("Prove");
	run("pnpm", ["turbo", "run", "build"]);
	run("pnpm", ["check"]);
	run("node", ["scripts/release-check.ts", "--no-build"]);

	step("Publish");
	run("pnpm", ["-r", "publish", "--access", "public"]);
	const missing = unpublished();
	if (missing.length > 0)
		stop(`npm does not hold ${tag} of ${missing.join(", ")}: run again`);
}

step("Record");
// `--follow-tags` pushes annotated tags only.
if (
	output("git", ["rev-parse", "-q", "--verify", `refs/tags/${tag}`]) ===
	undefined
)
	run("git", ["tag", "-a", tag, "-m", tag]);
run("git", ["push", "--follow-tags"]);

step("Smoke");
console.log(
	`${tag} is published. Smoke it from the registry as docs/procedures/publishing.md, "After publishing", says.`,
);
