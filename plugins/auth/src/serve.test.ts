import assert from "node:assert/strict";
import { test } from "node:test";
import { fixtureControls, type ServeWorker } from "@slotform/screens/serve";
import link from "./serve.ts";

const env = {
	SLOTFORM_SERVE_EMAIL: "f@example.com",
	SLOTFORM_SERVE_CODE: "000000",
};

// Answers the two email-code routes only for the fixture member's address and
// code, sent as JSON from the served origin.
const app: ServeWorker = {
	async fetch(request: Request) {
		const { pathname } = new URL(request.url);
		if (!pathname.startsWith("/api/auth/"))
			return new Response(`app ${pathname}`);
		if (
			request.method !== "POST" ||
			request.headers.get("origin") !== "http://localhost:1" ||
			request.headers.get("content-type") !== "application/json"
		)
			return new Response(null, { status: 403 });
		const body = (await request.json()) as Record<string, unknown>;
		if (
			pathname === "/api/auth/email-otp/send-verification-otp" &&
			body.email === env.SLOTFORM_SERVE_EMAIL &&
			body.type === "sign-in"
		)
			return Response.json({ success: true });
		if (
			pathname === "/api/auth/sign-in/email-otp" &&
			body.email === env.SLOTFORM_SERVE_EMAIL &&
			body.otp === env.SLOTFORM_SERVE_CODE
		)
			return new Response("{}", {
				headers: { "set-cookie": "session=abc; Path=/; HttpOnly" },
			});
		return new Response(null, { status: 401 });
	},
};
const ask = (worker: ServeWorker, path: string, vars: object = env) =>
	worker.fetch(
		new Request(`http://localhost:1${path}`),
		vars as never,
		undefined as never,
	);

test("serve link signs the fixture member in", async () => {
	const worker = fixtureControls(app, link);
	const signed = await ask(worker, "/fixture/link?to=/library");
	assert.equal(signed.status, 302);
	assert.equal(signed.headers.get("location"), "/library");
	assert.match(signed.headers.getSetCookie()[0] ?? "", /^session=abc/);
	assert.equal((await ask(worker, "/fixture/link", {})).status, 404);
	assert.equal(await (await ask(worker, "/rpc/a")).text(), "app /rpc/a");
});

test("serve link refuses a code the app does not take", async () => {
	const worker = fixtureControls(app, link);
	const refused = await ask(worker, "/fixture/link", {
		...env,
		SLOTFORM_SERVE_CODE: "111111",
	});
	assert.equal(refused.status, 502);
});

test("serve link redirects only to a path on the app", async () => {
	const worker = fixtureControls(app, link);
	for (const to of [
		"//evil.example",
		"/\\evil.example",
		"https://evil.example",
	]) {
		const signed = await ask(
			worker,
			`/fixture/link?to=${encodeURIComponent(to)}`,
		);
		assert.equal(signed.headers.get("location"), "/", to);
	}
});
