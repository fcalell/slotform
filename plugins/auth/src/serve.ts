import { type ExtraControls, FIXTURE_PREFIX } from "@slotform/screens/serve";
import { AUTH_PREFIX } from "./types.ts";
import { isSafeCallbackURL } from "./worker/callback-url.ts";

// The served app's `/fixture/link`: docs/architecture/plugins/auth.md, "Screens".
export default async function link(
	request: Request,
	context: Parameters<ExtraControls>[1],
): Promise<Response | undefined> {
	const url = new URL(request.url);
	if (url.pathname !== `${FIXTURE_PREFIX}/link`) return undefined;
	// `ExtraControls` types `env` as `unknown`: the served worker's bindings.
	const vars = context.env as Record<string, unknown>;
	const email = vars.SLOTFORM_SERVE_EMAIL;
	const code = vars.SLOTFORM_SERVE_CODE;
	if (typeof email !== "string" || typeof code !== "string")
		return new Response("fixture link: the app has no fixture member", {
			status: 404,
		});
	const post = (path: string, body: unknown) =>
		context.app(
			new Request(`${url.origin}${AUTH_PREFIX}${path}`, {
				method: "POST",
				headers: { "content-type": "application/json", origin: url.origin },
				body: JSON.stringify(body),
			}),
		);
	const sent = await post("/email-otp/send-verification-otp", {
		email,
		type: "sign-in",
	});
	if (!sent.ok)
		return new Response(`fixture link: the code was refused: ${sent.status}`, {
			status: 502,
		});
	const signed = await post("/sign-in/email-otp", { email, otp: code });
	if (!signed.ok)
		return new Response(`fixture link: sign-in was refused: ${signed.status}`, {
			status: 502,
		});
	const to = url.searchParams.get("to") ?? "/";
	const headers = new Headers({
		// A path on the app only, as a sign-in link's redirect is held to.
		location: isSafeCallbackURL(to, []) ? to : "/",
	});
	for (const cookie of signed.headers.getSetCookie())
		headers.append("set-cookie", cookie);
	return new Response(null, { status: 302, headers });
}
