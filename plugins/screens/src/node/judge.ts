import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Tab } from "./tab.ts";

// What `shoot` and `drive` judge a page with: docs/architecture/plugins/screens.md, "Judging shoot and drive".

const packageRoot = fileURLToPath(new URL("../..", import.meta.url));

let bundle: Promise<string> | undefined;

// The injected page code, built by the app's own Vite from this package's
// sources, once per process.
function pageCode(cwd: string): Promise<string> {
	bundle ??= (async () => {
		const entry = createRequire(join(cwd, "package.json")).resolve("vite");
		// The app's own Vite, imported by path: its types are this package's.
		const vite = (await import(
			pathToFileURL(entry).href
		)) as typeof import("vite");
		const { build } = vite;
		const built = await build({
			root: packageRoot,
			configFile: false,
			logLevel: "silent",
			build: {
				write: false,
				minify: false,
				lib: {
					entry: join(packageRoot, "src/ui/inject.ts"),
					formats: ["iife"],
					name: "stackScreens",
				},
			},
		});
		// A lib build with `write: false` returns its outputs, not the watcher.
		const [bundle] = (Array.isArray(built) ? built : [built]) as {
			output: { code: string }[];
		}[];
		return bundle?.output[0]?.code ?? "";
	})();
	return bundle;
}

function axeSource(cwd: string): string {
	const a11y = createRequire(join(cwd, "package.json")).resolve(
		"@storybook/addon-a11y/package.json",
	);
	const axe = createRequire(a11y).resolve("axe-core/axe.min.js");
	return readFileSync(axe, "utf8");
}

// Puts the page code in the tab, now and in every page it navigates to.
export async function prepare(tab: Tab, cwd: string): Promise<void> {
	const source = await pageCode(cwd);
	await tab.send("Page.addScriptToEvaluateOnNewDocument", { source });
	// Every later document gets the code from the registration above; the
	// current one is best effort.
	await tab.evaluate(source).catch(() => {});
}

// The page code is reached through a global of the page, the one link between
// this process and what `prepare` injected.
export const call = <T>(tab: Tab, expression: string): Promise<T> =>
	tab.evaluate<T>(`globalThis.__stackScreens.${expression}`);

export function settle(tab: Tab, cap: number) {
	return call<string>(tab, "READ_BUSY").then((busy) => tab.settle(cap, busy));
}

interface Violation {
	id: string;
	help: string;
	impact: string | null;
	nodes: { target: unknown[] }[];
}

// The findings on the page in the tab at `width`: horizontal overflow, the
// render walk, and axe with every rule (the document-level `region` and
// `target-size` among them), one line each.
export async function judge(
	tab: Tab,
	cwd: string,
	width: number,
	fonts: boolean,
): Promise<string[]> {
	const lines = await call<string[]>(tab, `checksAt(${width}, ${fonts})`);
	if ((await tab.evaluate<string>("typeof axe")) === "undefined")
		await tab.evaluate(axeSource(cwd));
	const violations = await tab.evaluate<Violation[]>(
		`(async () => { axe.configure({ rules: [{ id: "region", enabled: true }, { id: "target-size", enabled: true }] }); return (await axe.run(document)).violations.map(({ id, help, impact, nodes }) => ({ id, help, impact, nodes: nodes.map(({ target }) => ({ target })) })); })()`,
		60_000,
	);
	return [
		...lines,
		...violations.map(
			(v) =>
				`at ${width}px, axe ${v.id} (${v.impact}): ${v.help}: ${v.nodes
					.slice(0, 3)
					.map((n) => n.target.join(" "))
					.join(
						" | ",
					)}${v.nodes.length > 3 ? ` and ${v.nodes.length - 3} more` : ""}`,
		),
	];
}
