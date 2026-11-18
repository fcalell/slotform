import type { RateLimitBinding } from "@fcalell/plugin-api/procedure";
import { CLIENT_IP_HEADER } from "../types.ts";
import { emailKey } from "./email-key.ts";
import { tooManyRequests } from "./oauth.ts";

// The limiters the runtime finds bound: docs/architecture/plugins/auth.md, "Rate limiting".
// A type alias, so a consumer's declaration emit writes it out where it
// cannot name it.
export type AuthRateLimiter = {
	ip?: RateLimitBinding;
	email?: RateLimitBinding;
};

// The sends are the email-bombing amplifiers — the only auth routes that get
// a per-email limit on top of the blanket per-IP one. Both share the email's
// bucket. The magic-link verify is a GET with no body: per-IP only.
const EMAIL_SEND_SUFFIXES = [
	"/email-otp/send-verification-otp",
	"/sign-in/magic-link",
];

// Reads `email` off a cloned request body — the original must still reach
// Better Auth unconsumed. A body that fails to parse, or carries no
// non-empty string `email`, isn't an error here: the per-email check is
// simply skipped (the per-IP limit still applies).
async function readRequestEmail(request: Request): Promise<string | null> {
	try {
		const body: unknown = await request.clone().json();
		if (body && typeof body === "object" && "email" in body) {
			const email = body.email;
			if (typeof email === "string" && email.length > 0) return email;
		}
	} catch {
		// not JSON / no body — skip the per-email check
	}
	return null;
}

export async function checkRateLimit(
	request: Request,
	url: URL,
	rateLimiter: AuthRateLimiter | undefined,
): Promise<Response | null> {
	if (!rateLimiter) return null;

	if (rateLimiter.ip) {
		const ip = request.headers.get(CLIENT_IP_HEADER) ?? "unknown";
		const result = await rateLimiter.ip.limit({ key: ip });
		if (!result.success) return tooManyRequests();
	}

	if (
		rateLimiter.email &&
		EMAIL_SEND_SUFFIXES.some((suffix) => url.pathname.endsWith(suffix))
	) {
		const email = await readRequestEmail(request);
		if (email) {
			const result = await rateLimiter.email.limit({ key: emailKey(email) });
			if (!result.success) return tooManyRequests();
		}
	}

	return null;
}
