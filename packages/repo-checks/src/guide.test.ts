import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import { cliSlots } from "@fcalell/cli/cli-slots";
import { uiCoreGuide } from "@fcalell/ui-core/manifest";

const ROOT = new URL("../../../", import.meta.url).pathname;
const MAX_WORDS = 600;

interface Page {
	page: string;
}

// Prose words of a page: code fences, table rows and `## ` heading lines are not counted.
function proseWords(text: string): number {
	let fence = false;
	let words = 0;
	for (const line of text.split("\n")) {
		if (/^\s*(```|~~~)/.test(line)) {
			fence = !fence;
			continue;
		}
		if (fence || /^\s*\|/.test(line) || line.startsWith("## ")) continue;
		words += (line.match(/\S+/g) ?? []).length;
	}
	return words;
}

// The CLI's list is no export of the package, so its one home is read as text.
function cliPages(): string[] {
	const source = readFileSync(
		join(ROOT, "packages/cli/src/lib/guide.ts"),
		"utf8",
	);
	return [...source.matchAll(/^\s*page: "([^"]+)",/gm)].map(
		(m) => m[1] as string,
	);
}

function dirs(group: string): string[] {
	return readdirSync(join(ROOT, group)).filter((d) =>
		existsSync(join(ROOT, group, d, "package.json")),
	);
}

// A plugin lists its pages through `plugin({ guide })`; the built plugin
// hands them out as its contributions to `cliSlots.guide`.
async function pluginPages(dir: string): Promise<string[]> {
	const name = (
		JSON.parse(
			readFileSync(join(ROOT, "plugins", dir, "package.json"), "utf8"),
		) as { name: string }
	).name;
	const mod = (await import(name)) as Record<string, unknown>;
	type Built = {
		package: string;
		cli: {
			collect(ctx: { app: unknown; options: unknown; cwd: string }): {
				contributes: { slot: unknown; fn(ctx: unknown): unknown }[];
			};
		};
	};
	const built = Object.values(mod).find(
		(v): v is Built =>
			typeof v === "function" && (v as Partial<Built>).package === name,
	);
	assert.ok(built, `${name} exports its plugin`);
	const { contributes } = built.cli.collect({
		app: {},
		options: {},
		cwd: ROOT,
	});
	return contributes
		.filter((c) => c.slot === cliSlots.guide)
		.flatMap((c) => c.fn({}) as { package: string; page: string }[])
		.filter((e) => e.package === name)
		.map((e) => e.page);
}

function pagesOnDisk(dir: string): string[] {
	const guide = join(ROOT, dir, "guide");
	if (!existsSync(guide)) return [];
	return readdirSync(guide)
		.filter((f) => f.endsWith(".md"))
		.map((f) => f.slice(0, -3));
}

const names = (list: readonly Page[]) => list.map((e) => e.page);

test("every guide page holds at most 600 words of prose and is listed", async () => {
	const lists = new Map<string, string[]>([
		["packages/ui-core", names(uiCoreGuide)],
		["packages/cli", cliPages()],
	]);
	for (const dir of dirs("plugins"))
		lists.set(`plugins/${dir}`, await pluginPages(dir));

	const scanned = new Set<string>();
	const long: string[] = [];
	const unlisted: string[] = [];
	const missing: string[] = [];
	for (const group of ["packages", "plugins"]) {
		for (const d of dirs(group)) {
			const dir = `${group}/${d}`;
			const disk = pagesOnDisk(dir);
			const listed = lists.get(dir) ?? [];
			for (const page of disk) {
				const path = join(ROOT, dir, "guide", `${page}.md`);
				scanned.add(relative(ROOT, path));
				const words = proseWords(readFileSync(path, "utf8"));
				if (words > MAX_WORDS) long.push(`${relative(ROOT, path)}: ${words}`);
				if (!listed.includes(page)) unlisted.push(`${dir}/guide/${page}.md`);
			}
			for (const page of listed)
				if (!disk.includes(page)) missing.push(`${dir}/guide/${page}.md`);
		}
	}

	// A scan that reaches nothing finds nothing: it reaches a page of each group.
	for (const known of [
		"packages/ui-core/guide/voice.md",
		"packages/cli/guide/config.md",
		"plugins/react-ui/guide/rules.md",
	])
		assert.ok(scanned.has(known), known);

	assert.deepEqual(long, [], `pages over ${MAX_WORDS} words`);
	assert.deepEqual(unlisted, [], "pages on disk but not listed");
	assert.deepEqual(missing, [], "listed pages that do not exist");
});
