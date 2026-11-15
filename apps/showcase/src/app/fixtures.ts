import { ApiError } from "@fcalell/plugin-api/error";
import { defineFixtures } from "@fcalell/plugin-screens/fixtures";
import type { AppRouter } from "../../.stack/worker";
import { ago } from "./fixtures/ago.ts";

type Day = AppRouter["usage"]["requests"]["__output"][number];
type Member = AppRouter["members"]["list"]["__output"][number];
type Turn = AppRouter["assistant"]["history"]["__output"][number];

// The record a procedure answers for an id; one nothing holds answers not found.
function found<T>(record: T | undefined): T {
	if (record === undefined) throw new ApiError("NOT_FOUND");
	return record;
}

// ── Request rows ──────────────────────────────────────────────────────

type Request = AppRouter["requests"]["list"]["__output"]["data"][number];

// Fifty thousand requests the deploys served, made when first asked for: the
// window over them loads only the pages in view.
const TOTAL = 50_000;

const PATHS = [
	"/",
	"/pricing",
	"/docs/getting-started",
	"/docs/deploys",
	"/api/projects",
	"/api/deploys",
	"/api/usage",
	"/blog/edge-caching",
	"/login",
	"/assets/app.js",
];
const METHODS = ["GET", "GET", "GET", "POST", "PUT", "DELETE"] as const;
const STATES = ["done", "done", "done", "done", "attention", "failed"] as const;

// A cheap deterministic scatter, so a row is the same whenever it is asked for.
const scatter = (n: number) => Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;

let all: Request[] | undefined;
function requests(): Request[] {
	all ??= Array.from({ length: TOTAL }, (_, index) => {
		const path = PATHS[index % PATHS.length] as string;
		return {
			id: `req-${index}`,
			method: METHODS[Math.floor(scatter(index) * METHODS.length)] ?? "GET",
			path: `${path}${path === "/" ? "" : `/${index % 97}`}`,
			state: STATES[Math.floor(scatter(index + 1) * STATES.length)] ?? "done",
			took: Math.round(8 + scatter(index + 2) * 900),
			at: ago(index % 43_200),
		};
	});
	return all;
}

// ── Deploys ───────────────────────────────────────────────────────────

type Deploys = AppRouter["deploys"];
type Deploy = Deploys["list"]["__output"]["data"][number];
type Step = Deploys["get"]["__output"]["steps"][number];
type ChangedFile = Deploys["files"]["__output"][number];

const DEPLOYS: Deploy[] = [
	{
		id: "d1",
		author: "Ana Ruiz",
		message: "Cache the build output",
		branch: "main",
		commit: "a41c9e2",
		age: ago(2),
		state: "active",
		environment: "production",
		progress: 0.6,
	},
	{
		id: "d2",
		author: "Ben Kaya",
		message: "Move image resizing to the edge",
		branch: "preview/img-edge",
		commit: "7d0e2b1",
		age: ago(18),
		state: "done",
		environment: "preview",
	},
	{
		id: "d3",
		author: "Ema Okafor",
		message: "Pin wrangler to 4.12",
		branch: "main",
		commit: "0c5e4aa",
		age: ago(60),
		state: "failed",
		environment: "production",
	},
	{
		id: "d4",
		author: "Ana Ruiz",
		message: "Add Frankfurt to the region list",
		branch: "preview/regions",
		commit: "b71d0e2",
		age: ago(180),
		state: "waiting",
		environment: "preview",
	},
	{
		id: "d5",
		author: "Nightly schedule",
		message: "Nightly rebuild",
		branch: "main",
		commit: "e93a6c0",
		age: ago(1440),
		state: "done",
		environment: "production",
	},
];

// Every deploy runs the same steps.
const STEPS: Step[] = [
	{
		id: "install",
		name: "Install",
		state: "done",
		took: "38 s",
		log: `[10:40:04] pnpm install --frozen-lockfile
[10:40:31] Packages: +812
[10:40:42] Done in 38 s`,
	},
	{
		id: "build",
		name: "Build",
		state: "done",
		took: "51 s",
		log: `[10:40:43] vite build
[10:41:20] 214 modules transformed
[10:41:34] Built in 51 s`,
	},
	{
		id: "upload",
		name: "Upload",
		state: "active",
		took: "13 s",
		log: `[10:41:35] Uploading 38 files
[10:41:48] 31 of 38 uploaded`,
	},
];

// What a deploy changed: its files, its description before and after, its
// release notes and its build log.
interface Changes {
	files: ChangedFile[];
	description?: { before: string; after: string };
	notes: string;
	log: string;
}

const CACHE: Changes = {
	files: [
		{
			path: "src/build/cache.ts",
			before: `import { hash } from "./hash.ts";

async function restore(key: string) {
	return null;
}

async function save(key: string, dir: string) {
	await upload(key, dir);
}`,
			after: `import { hash } from "./hash.ts";
import { bucket } from "./bucket.ts";

async function restore(key: string) {
	const hit = await bucket.get(hash(key));
	return hit ? hit.unpack() : null;
}

async function save(key: string, dir: string) {
	await bucket.put(hash(key), await pack(dir));
}`,
		},
		{
			path: "src/build/bucket.ts",
			before: "",
			after: `export const bucket = env.BUILD_CACHE;
const ttl = 60 * 60 * 24 * 7;`,
			mark: "added",
		},
		{
			path: "src/build/steps/install.ts",
			before: `export const install = step("Install", async (ctx) => {
	await ctx.run("pnpm install --frozen-lockfile");
});`,
			after: `export const install = step("Install", async (ctx) => {
	if (await ctx.restore("node_modules")) return;
	await ctx.run("pnpm install --frozen-lockfile");
	await ctx.save("node_modules");
});`,
		},
		{
			path: "docs/deploys/caching-build-output-between-deploys.md",
			before: "Every deploy installs from scratch.",
			after:
				"A deploy restores the last build's dependencies when the lockfile has not changed.",
		},
	],
	description: {
		before:
			"Every deploy installs its dependencies from scratch, which takes about a minute on a large project.",
		after:
			"A deploy now restores the last build's dependencies when the lockfile has not changed, so installs take seconds on a large project.",
	},
	notes: `Installs restore the last build's dependencies when \`pnpm-lock.yaml\` has not changed.

- A cached install takes **about 4 s** instead of a minute.
- The cache keeps for seven days; a deploy with \`--no-cache\` skips it.
- Each project's cache is its own, so a preview never reads production's.

Read [how the cache is keyed](#cache) before you change the install step.`,
	log: `[10:40:02] Cloning acme/acme-web at a41c9e2
[10:40:04] Restoring cache for pnpm-lock.yaml
[10:40:05] Cache hit: node_modules (412 packages)
[10:40:05] stack generate
[10:40:06] wrote .stack/app.css
[10:40:06] wrote .stack/worker.ts
[10:40:06] wrote .stack/wrangler.jsonc
[10:40:07] tsc --noEmit
[10:40:12] 0 errors
[10:40:12] vite build
[10:40:13] resolving 10 plugins
[10:40:16] 214 modules transformed
[10:40:17] dist/index.html  0.46 kB
[10:40:17] built in 4.92s
[10:40:18] Saving cache for pnpm-lock.yaml
[10:40:19] Uploading 38 files
[10:40:21] Deployed to acme.dev`,
};

const WRANGLER: Changes = {
	files: [
		{
			path: "package.json",
			before: `{
	"name": "acme-web",
	"engines": { "node": ">=18" },
	"devDependencies": {
		"typescript": "^5.9.2",
		"wrangler": "^4.10.0"
	}
}`,
			after: `{
	"name": "acme-web",
	"engines": { "node": ">=18" },
	"devDependencies": {
		"typescript": "^5.9.2",
		"wrangler": "4.12.0"
	}
}`,
			mark: "dependencies",
		},
		{
			path: "pnpm-lock.yaml",
			before: `  wrangler:
    specifier: ^4.10.0
    version: 4.10.3`,
			after: `  wrangler:
    specifier: 4.12.0
    version: 4.12.0`,
			mark: "generated",
		},
	],
	notes:
		"Pins `wrangler` to 4.12 so every deploy builds with the same version.",
	log: `[09:51:40] Cloning acme/acme-web at 0c5e4aa
[09:51:42] Restoring cache for pnpm-lock.yaml
[09:51:42] Cache miss: the lockfile changed
[09:51:43] pnpm install --frozen-lockfile
[09:51:55] Packages: +414
[09:51:56] ERR_PNPM_UNSUPPORTED_ENGINE wrangler@4.12.0 needs node >=20.0.0
[09:51:56] Your Node version is 18.20.4
[09:51:56] Install failed after 13 s`,
};

const IMAGES: Changes = {
	files: [
		{
			path: "src/images/resize.ts",
			before: `export function resize(url: string, width: number) {
	return fetch(\`/resize?url=\${url}&w=\${width}\`);
}`,
			after: `export function resize(url: string, width: number) {
	return fetch(url, { cf: { image: { width, fit: "scale-down" } } });
}`,
		},
	],
	notes:
		"Images resize at the edge, so a first view no longer waits on the origin.",
	log: `[10:24:10] Cloning acme/acme-web at 7d0e2b1
[10:24:12] Cache hit: node_modules (412 packages)
[10:24:20] built in 3.41s
[10:24:23] Deployed to img-edge.acme-web.preview.acme.dev`,
};

const REGIONS: Changes = {
	files: [
		{
			path: "src/regions.ts",
			before: `export const regions = ["iad", "sin"];`,
			after: `export const regions = ["fra", "iad", "sin"];`,
		},
	],
	description: {
		before: "Deploys run in Washington and Singapore.",
		after: "Deploys run in Frankfurt, Washington and Singapore.",
	},
	notes: "Adds Frankfurt, `fra`, to the regions a deploy runs in.",
	log: `[07:12:30] Cloning acme/acme-web at b71d0e2
[07:12:31] Waiting for an approval to deploy to a new region`,
};

const NIGHTLY: Changes = {
	files: [],
	notes: "The nightly rebuild deploys `main` as it stands, with no new commit.",
	log: `[03:00:00] Cloning acme/acme-web at e93a6c0
[03:00:02] Cache hit: node_modules (412 packages)
[03:00:09] built in 3.02s
[03:00:12] Deployed to acme.dev`,
};

const CHANGES: Record<string, Changes> = {
	d1: CACHE,
	d2: IMAGES,
	d3: WRANGLER,
	d4: REGIONS,
	d5: NIGHTLY,
};

// ── Activity ──────────────────────────────────────────────────────────

// Tasks closed per week, 1 to 24: twenty-four buckets, each named by its week.
const COUNTS = [
	42, 31, 58, 24, 66, 19, 73, 38, 81, 27, 64, 33, 55, 22, 47, 29, 61, 36, 52,
	18, 44, 26, 39, 15,
];

const WEEKS = COUNTS.map((count, index) => ({
	week: `W${index + 1}`,
	count,
}));

// A day in six four-hour buckets, a run short enough to name every bar.
const HOURS = [
	["00h", 12],
	["04h", 6],
	["08h", 28],
	["12h", 51],
	["16h", 64],
	["20h", 47],
].map(([hour, count]) => ({ hour: String(hour), count: Number(count) }));

// ── Sprints ───────────────────────────────────────────────────────────

// The sprints tasks are filed under, the tasks in them and who each can be
// assigned to.
const BANDS = [
	{ key: "s1", label: "Sprint 1" },
	{ key: "s2", label: "Sprint 2" },
	{ key: "s3", label: "Sprint 3" },
];

const OWNERS = [
	{ value: "ana", label: "Ana Ruiz" },
	{ value: "ben", label: "Ben Kaya" },
	{ value: "ema", label: "Ema Okafor" },
];

const SPRINT_TASKS = [
	["c1", "Write release notes", "Docs", "s1", "ana"],
	["c2", "Fix login redirect", "Auth", "s1", "ben"],
	["c3", "Archive old logs", "Ops", "s1", "ana"],
	["c4", "Add dark mode", "Web", "s2", "ema"],
	["c5", "Rotate API keys", "Ops", "s2", "ben"],
	["c6", "Update pricing page", "Docs", "s2", "ana"],
	["c7", "Speed up search", "Web", "s3", "ema"],
	["c8", "Migrate billing", "Platform", "s3", "ben"],
].map(([id, title, area, sprint, owner]) => ({
	id: String(id),
	title: String(title),
	area: String(area),
	sprint: String(sprint),
	owner: String(owner),
}));

// ── Requests: a window over fifty thousand ──────────────────────────

type Sort = { column: "at" | "path" | "took"; direction: "asc" | "desc" };

// The whole set in the order asked for, kept: the same order is asked for once
// per page the view lands on.
const ordered = new Map<string, ReturnType<typeof requests>>();
function requestsBy(sort: Sort | undefined) {
	const key = sort ? `${sort.column}/${sort.direction}` : "at/desc";
	let rows = ordered.get(key);
	if (!rows) {
		const { column, direction } = sort ?? { column: "at", direction: "desc" };
		const sign = direction === "asc" ? 1 : -1;
		rows = [...requests()].sort((a, b) =>
			column === "took"
				? (a.took - b.took) * sign
				: String(a[column]).localeCompare(String(b[column])) * sign,
		);
		ordered.set(key, rows);
	}
	return rows;
}

// ── Releases ────────────────────────────────────────────────────────

const RELEASES: AppRouter["releases"]["list"]["__output"] = [
	{ id: "r1", name: "2.8.0", stage: "review", state: "waiting", age: ago(30) },
	{
		id: "r2",
		name: "2.7.3",
		stage: "review",
		state: "attention",
		age: ago(240),
	},
	{ id: "r3", name: "2.7.2", stage: "review", state: "waiting", age: ago(600) },
	{
		id: "r4",
		name: "2.7.1",
		stage: "staging",
		state: "running",
		age: ago(1440),
	},
	{ id: "r5", name: "2.7.0", stage: "staging", state: "done", age: ago(2880) },
	{
		id: "r6",
		name: "2.6.9",
		stage: "production",
		state: "done",
		age: ago(7200),
	},
];

// ── Projects: a column per stage ────────────────────────────────────

const STAGES = {
	building: [
		{ name: "acme-web", meta: "main · a41c9e2", age: ago(2) },
		{ name: "acme-api", meta: "main · 3f8b1d0", age: ago(6) },
	],
	preview: [
		{ name: "acme-docs", meta: "preview/search", age: ago(60) },
		{ name: "acme-admin", meta: "preview/roles", age: ago(180) },
		{ name: "acme-mail", meta: "preview/mjml", age: ago(1440) },
	],
	production: [
		{ name: "acme-cdn", meta: "main · e93a6c0", age: ago(1440) },
		{ name: "acme-status", meta: "main · 51aa7e3", age: ago(5760) },
	],
};

// ── Usage ───────────────────────────────────────────────────────────

// Build minutes a day, the last 30 days, each day timed.
const MINUTES = [
	140, 160, 170, 150, 120, 110, 150, 170, 180, 160, 170, 120, 110, 160, 190,
	180, 170, 200, 130, 120, 170, 180, 210, 190, 180, 120, 110, 160, 170, 150,
];
const DAYS: Day[] = MINUTES.map((value, index) => {
	const day = new Date(Date.UTC(2026, 8, 3 + index)).toLocaleDateString("en", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
	return { day, value, at: day };
});

// Requests a day this week, by project.
const PROJECTS = ["acme-web", "acme-api", "acme-docs"];
const WEEK: Array<[string, number[]]> = [
	["Mon", [52_000, 31_000, 9_000]],
	["Tue", [61_000, 33_000, 8_000]],
	["Wed", [64_000, 41_000, 11_000]],
	["Thu", [58_000, 36_000, 14_000]],
	["Fri", [47_000, 30_000, 7_000]],
	["Sat", [21_000, 12_000, 4_000]],
	["Sun", [19_000, 10_000, 3_000]],
];
const REQUESTS: Day[] = WEEK.map(([day, values]) => ({
	day,
	value: values.reduce((sum, value) => sum + value, 0),
	parts: Object.fromEntries(
		PROJECTS.map((project, index) => [project, values[index] ?? 0]),
	),
	at: day,
}));

// ── Members ─────────────────────────────────────────────────────────

const MEMBERS: Member[] = [
	{
		id: "ana",
		name: "Ana Ruiz",
		email: "ana@acme.dev",
		role: "owner",
		team: "Platform",
		deploys: true,
		active: ago(2),
	},
	{
		id: "ben",
		name: "Ben Kaya",
		email: "ben@acme.dev",
		role: "admin",
		team: "Web",
		deploys: true,
		active: ago(18),
	},
	{
		id: "ema",
		name: "Ema Okafor",
		email: "ema@acme.dev",
		role: "member",
		team: "Platform",
		deploys: true,
		active: ago(60),
	},
	{
		id: "chen",
		name: "Chen Wu",
		email: "chen@acme.dev",
		role: "viewer",
		team: "Design",
		deploys: false,
		active: ago(60 * 26),
	},
	{
		id: "dara",
		name: "Dara Novak",
		email: "dara.novak@acme.dev",
		role: "member",
		team: "",
		deploys: false,
		active: ago(60 * 24 * 9),
	},
];

// ── Assistant ───────────────────────────────────────────────────────

// A moment today at a clock time, as the ISO string a Message formats.
function today(time: string): string {
	const [hours = 0, minutes = 0] = time.split(":").map(Number);
	const at = new Date();
	at.setHours(hours, minutes, 0, 0);
	return at.toISOString();
}

const TURNS: Turn[] = [
	{
		id: "t1",
		author: "system",
		body: "Started from the failed deploy 0c5e4aa",
		at: today("09:53"),
		deploy: "d3",
	},
	{
		id: "t2",
		author: "you",
		body: "Why did the deploy of acme-web fail?",
		at: today("09:53"),
	},
	{
		id: "t3",
		author: "other",
		body: `The install failed: \`wrangler@4.12.0\` needs Node 20, and the build image is Node 18.

Pick one:

1. Move the build image to **Node 20** under Settings, then redeploy.
2. Pin \`wrangler\` back to \`^4.10.0\` in \`package.json\`.

Node 18 leaves the build images on Oct 12, so the first keeps working longer.`,
		at: today("09:54"),
	},
	{
		id: "t4",
		author: "you",
		body: "Move it to Node 20 and redeploy.",
		at: today("09:56"),
	},
	{
		id: "t5",
		author: "system",
		body: "Ana Ruiz redeployed a41c9e2",
		at: today("10:40"),
		deploy: "d1",
	},
	{
		id: "t6",
		author: "other",
		body: "The redeploy is building on Node 20. The install restored its cache, so it should be ready in about two minutes.",
		at: today("10:41"),
	},
];

// The data of every procedure the app calls, and an example value for each
// route `$param`: the screens workbench answers from these.
export default defineFixtures<AppRouter>(
	{
		deploys: {
			// The cursor is the index of a page's first deploy.
			list: ({ cursor, limit }) => {
				const from = Number(cursor ?? 0);
				const to = from + (limit ?? DEPLOYS.length);
				return {
					data: DEPLOYS.slice(from, to),
					nextCursor: to < DEPLOYS.length ? String(to) : null,
				};
			},
			get: ({ id }) => {
				const deploy = found(DEPLOYS.find((each) => each.id === id));
				const { description, notes } = found(CHANGES[id]);
				return { ...deploy, description, notes, steps: STEPS };
			},
			files: ({ id }) => found(CHANGES[id]).files,
			log: ({ id }) => found(CHANGES[id]).log,
			remove: () => undefined,
			removePreviews: () => undefined,
		},
		requests: {
			list: ({ q, offset = 0, limit = 20, sort }) => {
				const rows = requestsBy(sort);
				const matching = q ? rows.filter((row) => row.path.includes(q)) : rows;
				return {
					data: matching.slice(offset, offset + limit),
					total: matching.length,
					offset,
				};
			},
			remove: () => undefined,
		},
		flow: {
			graph: () => ({
				steps: [
					{
						id: "start",
						role: "start",
						title: "Push",
						line: "main",
						status: "done",
					},
					{
						id: "build",
						role: "step",
						title: "Build",
						line: "Install and bundle",
						status: "running",
					},
					{
						id: "ship",
						role: "end",
						title: "Ship",
						line: "Production",
						status: "waiting",
					},
					{
						id: "hold",
						role: "end",
						title: "Hold",
						line: "Back to review",
						status: "waiting",
					},
				],
				// The build has two ways out, side by side: wider than a phone's pane
				// at the text floor, so the screen run at 320 opens the overview.
				links: [
					{ id: "start-build", from: "start", to: "build" },
					{ id: "build-ship", from: "build", to: "ship", label: "when green" },
					{ id: "build-hold", from: "build", to: "hold", label: "when red" },
				],
			}),
		},
		projects: { list: ({ stage }) => STAGES[stage] },
		keys: {
			// The request the draft would send; the token is only counted.
			preview: ({ name, scope, tokenLength }) => [
				{ label: "Endpoint", value: "POST /v1/keys" },
				{ label: "Name", value: name || "Not set" },
				{ label: "Scope", value: scope ?? "read" },
				{
					label: "Token",
					value: tokenLength ? `${tokenLength} characters, masked` : "Not set",
				},
			],
			create: () => ({ id: "key-1" }),
		},
		releases: {
			list: ({ stage }) =>
				RELEASES.filter((release) => !stage || release.stage === stage),
			quota: () => ({ left: 2 }),
			stages: () => [
				{ value: "review", label: "In review", count: 3 },
				{ value: "staging", label: "Staging", count: 2 },
				{ value: "production", label: "Production", count: 1 },
			],
			shipped: () => ({ count: 14 }),
			rolledBack: () => ({ count: 2 }),
			promote: () => undefined,
		},
		activity: { weeks: () => WEEKS, hours: () => HOURS },
		sprints: {
			tasks: () => SPRINT_TASKS,
			bands: () => BANDS,
			owners: () => OWNERS,
			assign: () => undefined,
		},
		usage: {
			meters: () => [
				{
					label: "Requests",
					value: 412_000,
					max: 1_000_000,
					unit: "requests",
					meta: "412,000 of 1M requests",
				},
				{
					label: "Build minutes used this billing month",
					value: 5_640,
					max: 6_000,
					unit: "minutes",
					meta: "5,640 of 6,000 minutes, 360 left",
				},
				{
					label: "Storage",
					value: 11.8,
					max: 10,
					unit: "GB",
					meta: "1.8 GB over, billed at the end of the month",
				},
			],
			requests: () => REQUESTS,
			minutes: () => DAYS,
			// None ran this week.
			cron: () => [],
			plan: () => [
				{ label: "Requests", values: ["1M a month", "10M a month"] },
				{ label: "Build minutes", values: ["6,000 a month", "25,000 a month"] },
				{ label: "Storage", values: ["10 GB", "100 GB"] },
				{ label: "Audit log", values: ["Not included", "Kept 90 days"] },
				{
					label: "Billed",
					values: ["$120 a month", "$480 a month, from Oct 14"],
				},
			],
			upgrade: () => undefined,
		},
		domains: {
			list: () => [
				{
					name: "acme.dev",
					state: "done",
					meta: "Primary · certificate valid",
				},
				{
					name: "www.acme.dev",
					state: "done",
					meta: "Redirects to acme.dev",
				},
				{ name: "shop.acme.dev", state: "waiting", meta: "Waiting for DNS" },
			],
			verify: () => undefined,
		},
		assistant: { history: () => TURNS },
		tasks: {
			list: () => [
				{
					id: "k1",
					title: "Review the failed deploy of acme-web",
					meta: "Today",
				},
				{
					id: "k2",
					title: "Renew the acme.dev certificate",
					meta: "In 3 days",
				},
				{
					id: "k3",
					title: "Invite the new on-call engineer",
					meta: "This week",
				},
				{
					id: "k4",
					title: "Move the build image to Node 20",
					meta: "Next week",
				},
				{
					id: "k5",
					title: "Prune the stale preview deploys",
					meta: "Next week",
				},
			],
		},
		members: {
			list: () => MEMBERS,
			update: ({ id, ...change }) => ({
				...found(MEMBERS.find((each) => each.id === id)),
				...change,
			}),
			// The new owner takes ownership, the old one stays an admin.
			transfer: ({ id }) =>
				MEMBERS.map((member): Member => {
					if (member.id === id) return { ...member, role: "owner" };
					if (member.role === "owner") return { ...member, role: "admin" };
					return member;
				}),
			invite: () => undefined,
			revokeInvitation: () => undefined,
		},
		settings: {
			general: () => ({
				name: "Acme",
				slug: "acme",
				about:
					"Production and preview deploys for the Acme storefront and its API.",
				region: "fra",
			}),
			save: () => undefined,
		},
		devices: {
			list: () => ["Ana's Pixel 9"],
			unpair: () => undefined,
		},
		account: {
			request: () => ({ email: "ana@acme.dev" }),
		},
		auth: {
			signIn: {
				sendOtp: ({ email }) => ({ email }),
				verifyOtp: () => undefined,
			},
		},
		workspaces: {
			list: () => [
				{ name: "Acme", meta: "12 members" },
				{ name: "Globex", meta: "4 members" },
				{ name: "Initech", meta: "31 members" },
				{ name: "Hooli", meta: "9 members" },
			],
		},
	},
	{
		deployId: "d1",
		stepId: "install",
		// A step screen is drawn on another deploy than the rest.
		"/_app/deploys/$deployId/steps/$stepId": { deployId: "d3" },
	},
);
