// The controls of a served app, under `/fixture/*`, as a wrapper over its
// worker. This module runs inside the worker (Node or workerd): web APIs only.

export interface ServeWorker {
	fetch(request: Request, env: never, ctx: never): Response | Promise<Response>;
}

// The path every control lives under.
export const FIXTURE_PREFIX = "/fixture";

// A plugin's or an app's own controls for `/fixture/*`.
// Order and fall-through: docs/architecture/plugins/screens.md, "Serve".
export type ExtraControls = (
	request: Request,
	context: {
		env: unknown;
		ctx: unknown;
		// Asks the app's own worker, past the controls: how a control makes the
		// requests of a real flow.
		app(request: Request): Promise<Response>;
	},
) => Response | undefined | Promise<Response | undefined>;

function number(url: URL, name: string): number | null {
	const given = url.searchParams.get(name);
	const value = Number(given);
	return given !== null && Number.isInteger(value) && value >= 0 ? value : null;
}

function matcher(pattern: string): RegExp {
	const source = pattern
		.split("*")
		.map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
		.join(".*");
	return new RegExp(source);
}

// Answers a worker's requests as the app does, and the `/fixture/*` paths.
// The paths and their patterns: docs/architecture/plugins/screens.md, "Serve".
export function fixtureControls<W extends ServeWorker>(
	worker: W,
	...extra: ExtraControls[]
): W {
	const delays = new Map<string, number>();
	const fails = new Map<string, number>();

	async function control(
		request: Request,
		url: URL,
		env: never,
		ctx: never,
	): Promise<Response> {
		for (const ask of extra) {
			const own = await ask(request, {
				env,
				ctx,
				app: async (inner) => worker.fetch(inner, env, ctx),
			});
			if (own) return own;
		}
		const name = url.pathname.slice(FIXTURE_PREFIX.length + 1);
		const match = url.searchParams.get("match");
		if (name === "delay" || name === "fail") {
			const value = number(url, name === "delay" ? "ms" : "status");
			if (match === null || value === null)
				return new Response(
					`fixture ${name}: give match and ${name === "delay" ? "ms" : "status"}`,
					{ status: 400 },
				);
			const rules = name === "delay" ? delays : fails;
			if (value === 0) rules.delete(match);
			else rules.set(match, value);
			return new Response(`${name} ${match} ${value}`);
		}
		// `stack screens serve` asks every app for `link`, so an app no plugin
		// answers it for gets a reason, not a bare 404.
		if (name === "link")
			return new Response("fixture link: no plugin signs a fixture member in", {
				status: 404,
			});
		return new Response(`fixture: no control ${name}`, { status: 404 });
	}

	// `W` may hold members beyond `fetch`, which the spread keeps.
	return {
		...worker,
		async fetch(request: Request, env: never, ctx: never) {
			const url = new URL(request.url);
			if (url.pathname.startsWith(`${FIXTURE_PREFIX}/`))
				return control(request, url, env, ctx);
			for (const [match, ms] of delays)
				if (matcher(match).test(url.pathname))
					await new Promise((resolve) => setTimeout(resolve, ms));
			for (const [match, status] of fails)
				if (matcher(match).test(url.pathname))
					return Response.json(
						{ code: "FIXTURE_FAILURE", status, message: "fixture failure" },
						{ status },
					);
			return worker.fetch(request, env, ctx);
		},
	} as W;
}
