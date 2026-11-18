import type { Context } from "hono";
import { extractIp, type RateLimitBinding } from "../procedure.ts";

// The `/rpc` limiter's binding name, the contract with plugin-cloudflare: docs/architecture/plugins/api.md, "Rate limiting".
export const RATE_LIMITER_RPC = "RATE_LIMITER_RPC";

// The Hono variable the worker sets to a request's effective CORS allow-list.
export const ORIGINS_VAR = "__stackOrigins";

// The blanket per-IP `/rpc` limiter: docs/architecture/plugins/api.md, "Rate limiting". True when the limiter refuses.
export async function ipLimited(
	c: Context,
	ctx: Record<string, unknown>,
): Promise<boolean> {
	const limiter = (c.env as Record<string, unknown> | null | undefined)?.[
		RATE_LIMITER_RPC
	] as RateLimitBinding | undefined;
	if (!limiter || ctx._devMode) return false;
	const result = await limiter.limit({ key: extractIp(c.req.raw.headers) });
	return !result.success;
}

// The CSRF guard for raw routes: docs/architecture/plugins/api.md, "At runtime".
export function isForbiddenOrigin(c: Context): boolean {
	const origin = c.req.header("origin");
	if (!origin) return false;
	const allowed = c.get(ORIGINS_VAR) as string[] | undefined;
	// Wildcard CORS admits every origin; the guard must agree with the CORS
	// layer instead of judging all real browser origins forbidden.
	if (allowed?.includes("*")) return false;
	if (!allowed) {
		throw new Error(
			"isForbiddenOrigin: no origin list on this request. Register the middleware with .useAfterContext() (src/worker/middleware.context.ts), not .use().",
		);
	}
	return !allowed.includes(origin);
}
