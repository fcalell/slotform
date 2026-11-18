import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { openedPart, slug } from "../slug.ts";
import type { ControlPoint } from "../ui/aim.ts";
import { press } from "../ui/press.ts";
import { DESKTOP, HEIGHT, PHONE, SHOT_MAX_HEIGHT } from "../widths.ts";
import { withLease } from "./browser.ts";
import { call, judge, prepare, settle } from "./judge.ts";
import { parseList } from "./select.ts";
import type { Tab } from "./tab.ts";

// `stack screens shoot` and `drive`: a live app opened in the shared browser,
// judged and shot at each width and mode. `shoot` visits routes; `drive` runs a
// plan (`drive.ts`) over the same `Page`.

export interface Target {
	// The app's origin and any path it is served under.
	url: string;
	cwd: string;
	// Where the PNGs go, absolute.
	dir: string;
	// A shot grows the page to all it holds, not the viewport.
	full: boolean;
	// The most a page may take to go quiet, in ms.
	settle: number;
	cookie?: string;
	signIn?: string;
}

export const messageOf = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

// A route's name in a file: `/` is `index`, `/deploys/abc?x=1` is
// `deploys-abc-x-1`.
export const routeSlug = (route: string): string => slug(route) || "index";

export const shotName = (
	name: string,
	width: number,
	mode: string,
	opened?: string,
): string => `${name}-${width}-${mode}${openedPart(opened)}.png`;

// The viewports of a run without its own: a phone and a monitor, dark.
export const DEFAULT_WIDTHS = [PHONE, DESKTOP];
export const DEFAULT_MODE = "dark";

// A viewport width in px; `at` names the value and where it came from.
export function parseWidth(value: unknown, at: string): number {
	if (
		typeof value !== "number" ||
		!Number.isInteger(value) ||
		value < 200 ||
		value > 4000
	)
		throw new Error(`${at} is not a width in px (200 to 4000)`);
	return value;
}

// A value of `prefers-color-scheme`; `at` names the value and where it came
// from.
export function parseMode(value: unknown, at: string): string {
	if (value !== "light" && value !== "dark")
		throw new Error(`${at} is not light or dark`);
	return value;
}

export function parseWidthList(value: unknown): number[] {
	const items = parseList(value);
	if (items.length === 0) return [...DEFAULT_WIDTHS];
	return items.map((item) => parseWidth(Number(item), `--width: ${item}`));
}

export function parseModes(value: unknown): string[] {
	const modes = parseList(value);
	if (modes.length === 0) return [DEFAULT_MODE];
	return modes.map((mode) => parseMode(mode, `--mode: ${mode}`));
}

export function parseCookie(
	value: unknown,
): { name: string; value: string } | undefined {
	if (value === undefined) return undefined;
	const text = String(value);
	const at = text.indexOf("=");
	if (at < 1) throw new Error("--cookie: give name=value");
	return { name: text.slice(0, at), value: text.slice(at + 1) };
}

function parseSettle(value: unknown): number {
	if (value === undefined) return 10_000;
	const ms = Number(value);
	if (!Number.isFinite(ms) || ms < 0)
		throw new Error("--settle: give milliseconds");
	return ms;
}

function parseApp(value: unknown): string {
	if (typeof value !== "string" || value === "")
		throw new Error(
			"--url: give the app's address, like http://localhost:3000",
		);
	return new URL(value).href;
}

export function target(flags: Record<string, unknown>, cwd: string): Target {
	return {
		url: parseApp(flags.url),
		cwd,
		dir: resolve(
			cwd,
			typeof flags.shots === "string" ? flags.shots : ".stack/shots",
		),
		full: flags.full === true,
		settle: parseSettle(flags.settle),
		cookie: typeof flags.cookie === "string" ? flags.cookie : undefined,
		signIn: typeof flags["sign-in"] === "string" ? flags["sign-in"] : undefined,
	};
}

// Follows the sign-in link, if any, in a tab of its own: the session it sets
// holds for every tab of the context.
export async function signIn(
	scope: { tab(): Promise<Tab> },
	target: Target,
): Promise<void> {
	const link = target.signIn;
	if (!link) return;
	const tab = await scope.tab();
	await closeAfter(tab, async () => {
		await setCookie(tab, target);
		await prepare(tab, target.cwd);
		await tab.goto(new URL(link, target.url).href);
		await settle(tab, target.settle);
	});
}

async function setCookie(tab: Tab, target: Target): Promise<void> {
	const cookie = parseCookie(target.cookie);
	if (cookie) await tab.cookie(cookie.name, cookie.value, target.url);
}

// Runs a tab's work and closes the tab. A close that fails after the work
// failed is printed, so the work's own error is the one that surfaces; after
// the work succeeded it fails the command.
export async function closeAfter(
	tab: Tab,
	work: () => Promise<void>,
): Promise<void> {
	try {
		await work();
	} catch (error) {
		await tab.close().catch((closeError: unknown) => {
			console.error(`closing the tab failed: ${messageOf(closeError)}`);
		});
		throw error;
	}
	await tab.close();
}

// A tab of the app at one width and mode, with the page code in it and the
// cookie set.
export class Page {
	findings: string[] = [];
	// What the run says and does not fail on: a page still busy at the cap.
	notes: string[] = [];
	shots: string[] = [];

	readonly tab: Tab;
	readonly target: Target;
	readonly width: number;
	readonly mode: string;

	private constructor(tab: Tab, target: Target, width: number, mode: string) {
		this.tab = tab;
		this.target = target;
		this.width = width;
		this.mode = mode;
	}

	static async open(
		scope: { tab(): Promise<Tab> },
		target: Target,
		width: number,
		mode: string,
	): Promise<Page> {
		const tab = await scope.tab();
		await tab.media(mode);
		await tab.device(width, HEIGHT);
		await prepare(tab, target.cwd);
		await setCookie(tab, target);
		return new Page(tab, target, width, mode);
	}

	async goto(path: string): Promise<void> {
		await this.tab.goto(new URL(path, this.target.url).href);
		await this.quiet();
	}

	async quiet(): Promise<void> {
		const busy = await settle(this.tab, this.target.settle);
		if (busy)
			this.notes.push(`${this.label}: settle: ${busy}, shot as it stood`);
	}

	report(line: string): void {
		this.findings.push(`${this.label}: ${line}`);
	}

	get label(): string {
		return `${this.width}px ${this.mode}`;
	}

	async open(text: string): Promise<void> {
		const failure = await press(
			{
				aim: (align) =>
					call<ControlPoint | null>(
						this.tab,
						`aim(${JSON.stringify(text)}, ${JSON.stringify(align)})`,
					),
				click: (x, y) => this.tab.click(x, y),
				landed: () => call<string | null>(this.tab, "landed()"),
			},
			text,
		);
		if (failure) throw new Error(failure);
		await this.quiet();
	}

	// Judges the page as it is and writes its shot, the viewport or with
	// `--full` all the page holds. The fonts are judged once a screen: not again
	// with a control open.
	async shoot(name: string, opened?: string): Promise<void> {
		const found = await judge(
			this.tab,
			this.target.cwd,
			this.width,
			opened === undefined,
		);
		for (const line of found)
			this.report(opened ? `with "${opened}" open: ${line}` : line);
		let height = HEIGHT;
		if (this.target.full) {
			for (
				let hidden = await call<number>(this.tab, "hiddenHeight()");
				hidden > 0 && height < SHOT_MAX_HEIGHT;
				hidden = await call<number>(this.tab, "hiddenHeight()")
			) {
				height = Math.min(height + hidden, SHOT_MAX_HEIGHT);
				await this.tab.device(this.width, height);
				await this.quiet();
			}
		}
		const file = join(
			this.target.dir,
			shotName(name, this.width, this.mode, opened),
		);
		await mkdir(dirname(file), { recursive: true });
		await writeFile(file, await this.tab.screenshot());
		this.shots.push(file);
		if (height !== HEIGHT) await this.tab.device(this.width, HEIGHT);
	}
}

export function printRun(label: string, pages: Page[]): void {
	const shots = pages.flatMap((page) => page.shots);
	const findings = pages.flatMap((page) => page.findings);
	const notes = pages.flatMap((page) => page.notes);
	console.log(
		[`${label}: ${shots.length} shots`, ...shots, ...notes].join("\n"),
	);
	if (findings.length > 0) {
		console.log(findings.join("\n"));
		throw new Error(`${label}: ${findings.length} findings`);
	}
}

export async function shoot(
	flags: Record<string, unknown>,
	cwd: string,
): Promise<void> {
	const app = target(flags, cwd);
	const routes = parseList(flags.route);
	if (routes.length === 0)
		throw new Error("--route: give the routes to shoot, like /,/deploys");
	const widths = parseWidthList(flags.width);
	const modes = parseModes(flags.mode);
	const open = typeof flags.open === "string" ? flags.open : undefined;
	const pages: Page[] = [];
	await withLease(async (lease) => {
		const scope = await lease.context();
		await signIn(scope, app);
		for (const mode of modes) {
			for (const width of widths) {
				const page = await Page.open(scope, app, width, mode);
				pages.push(page);
				await closeAfter(page.tab, async () => {
					// A route that fails is reported and the next one still runs.
					for (const route of routes) {
						try {
							await page.goto(route);
							await page.shoot(routeSlug(route));
							if (open) {
								await page.open(open);
								await page.shoot(routeSlug(route), open);
							}
						} catch (error) {
							page.report(`${route}: ${messageOf(error)}`);
						}
					}
				});
			}
		}
	});
	printRun("stack screens shoot", pages);
}
