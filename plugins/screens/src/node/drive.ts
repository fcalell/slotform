import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { withLease } from "./browser.ts";
import {
	DEFAULT_MODE,
	DEFAULT_WIDTHS,
	messageOf,
	Page,
	parseMode,
	parseWidth,
	printRun,
	signIn,
	target,
} from "./shoot.ts";

// `stack screens drive <plan.json> --url <app>`: a plan is a list of steps run
// in a tab of the app, once for each viewport of `each`.

// A key, typing or a scroll has no event that says the page has reacted.
const REACT_MS = 150;

// Each step kind and the type of its value.
const KINDS = {
	goto: "string",
	open: "string",
	key: "string",
	type: "string",
	fx: "string",
	shot: "string",
	offline: "boolean",
	scroll: "number",
} as const;

type Kind = keyof typeof KINDS;

interface Values {
	string: string;
	boolean: boolean;
	number: number;
}

// One kind and its value; a scroll may name the element it scrolls (`in`).
type Step = {
	[K in Kind]: { [P in K]: Values[(typeof KINDS)[K]] } & (K extends "scroll"
		? { in?: string }
		: unknown);
}[Kind];

interface Plan {
	each: { width: number; mode: string }[];
	steps: Step[];
}

const isKind = (key: string): key is Kind => key in KINDS;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

// Parses a plan. A step of a kind this list does not name, with a value of
// the wrong type, or with two kinds in one object, fails the whole plan before
// anything runs.
export function parsePlan(text: string): Plan {
	const plan: unknown = JSON.parse(text);
	const items = isRecord(plan) ? plan.steps : undefined;
	if (!Array.isArray(items) || items.length === 0)
		throw new Error('the plan has no steps: expected { "steps": [...] }');
	const steps = items.map((raw: unknown, index): Step => {
		const at = `step ${index + 1} ${JSON.stringify(raw)}`;
		if (!isRecord(raw)) throw new Error(`${at} is not an object`);
		const keys = Object.keys(raw).filter(
			(key) => !(key === "in" && "scroll" in raw),
		);
		const [kind] = keys;
		if (keys.length !== 1 || kind === undefined || !isKind(kind))
			throw new Error(
				`${at}: a step has exactly one of ${Object.keys(KINDS).join(", ")}`,
			);
		if (typeof raw[kind] !== KINDS[kind])
			throw new Error(`${at}: ${kind} takes a ${KINDS[kind]}`);
		if ("in" in raw && typeof raw.in !== "string")
			throw new Error(`${at}: in takes a CSS selector`);
		// Its one kind and that kind's value type are checked above.
		return raw as Step;
	});
	const given = isRecord(plan) ? plan.each : undefined;
	if (given !== undefined && !Array.isArray(given))
		throw new Error('each: expected a list of { "width": <px>, "mode": ... }');
	const each = (given ?? DEFAULT_WIDTHS.map((width) => ({ width }))).map(
		(entry: unknown) => {
			if (!isRecord(entry))
				throw new Error(`each: ${JSON.stringify(entry)} is not an object`);
			const mode = entry.mode ?? DEFAULT_MODE;
			return {
				width: parseWidth(entry.width, `each: width ${String(entry.width)}`),
				mode: parseMode(mode, `each: mode ${String(mode)}`),
			};
		},
	);
	return { each, steps };
}

// `{{fx}}` in a step's text is the last `fx` step's answer, taken as it is: a
// `$` in it is no replacement pattern.
export const fill = (text: string, fx: string): string =>
	text.replaceAll("{{fx}}", () => fx);

async function run(page: Page, steps: Step[]): Promise<void> {
	let fx = "";
	for (const [index, step] of steps.entries()) {
		const at = `step ${index + 1} ${JSON.stringify(step)}`;
		try {
			if ("goto" in step) await page.goto(fill(step.goto, fx));
			else if ("open" in step) await page.open(fill(step.open, fx));
			else if ("key" in step) {
				await page.tab.key(step.key);
				await sleep(REACT_MS);
			} else if ("type" in step) {
				await page.tab.type(fill(step.type, fx));
				await sleep(REACT_MS);
			} else if ("fx" in step) {
				const path = JSON.stringify(
					new URL(fill(step.fx, fx), page.target.url).href,
				);
				fx = await page.tab.evaluate<string>(
					`fetch(${path}, { credentials: "include" }).then((r) => r.text())`,
				);
			} else if ("shot" in step) await page.shoot(step.shot);
			else if ("offline" in step) await page.tab.offline(step.offline);
			else {
				const scroller = step.in
					? `document.querySelector(${JSON.stringify(step.in)})`
					: "document.scrollingElement";
				await page.tab.evaluate(`${scroller}.scrollTop = ${step.scroll}`);
				await sleep(REACT_MS);
			}
		} catch (error) {
			throw new Error(`${at}: ${messageOf(error)}`);
		}
	}
}

export async function drive(
	file: string,
	flags: Record<string, unknown>,
	cwd: string,
): Promise<void> {
	const plan = parsePlan(readFileSync(file, "utf8"));
	const app = target(flags, cwd);
	const pages: Page[] = [];
	await withLease(async (lease) => {
		const scope = await lease.context();
		await signIn(scope, app);
		for (const { width, mode } of plan.each) {
			const page = await Page.open(scope, app, width, mode);
			pages.push(page);
			try {
				await run(page, plan.steps);
			} catch (error) {
				page.report(messageOf(error));
			} finally {
				await page.tab.close();
			}
		}
	});
	printRun("stack screens drive", pages);
}
