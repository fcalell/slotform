import { apiKey } from "@better-auth/api-key";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";

// Device credentials: docs/architecture/plugins/auth.md, "Devices".

// Every key starts with this, so a bearer that is not a device key (an
// expo session token, an OAuth access token) is never mistaken for one.
const DEVICE_KEY_PREFIX = "stk_";

// The random characters after the prefix: 48 letters, about 285 bits.
const KEY_LENGTH = 48;

// Calls one key may make in a window, enforced in the database row, so it
// holds on Node as on Cloudflare. Pinned, not options: a daemon that batches
// stays far under it, and one that loops is the case it exists for.
const RATE_LIMIT = { timeWindow: 60_000, maxRequests: 600 };

// Longest name a member can give a device.
export const DEVICE_NAME_MAX = 40;

// Furthest a key's expiry may be set, in days; a key made without one does
// not expire.
export const DEVICE_EXPIRES_MAX_DAYS = 365;

const BEARER = new RegExp(`^bearer\\s+(${DEVICE_KEY_PREFIX}\\S+)$`, "i");

// The device key the request carries, or null. Anything else in the header is
// not ours and is left to the plugins that read it.
export function deviceCredential(
	headers: Headers | undefined | null,
): string | null {
	const value = headers?.get("authorization")?.trim();
	return (value && BEARER.exec(value)?.[1]) || null;
}

// Auth endpoints a device key may reach: docs/architecture/plugins/auth.md, "Devices".
const DEVICE_ENDPOINTS = new Set([
	"/get-session",
	"/organization/list",
	"/organization/get-full-organization",
	"/organization/get-active-member",
	"/organization/list-members",
	"/organization/has-permission",
]);

const DEVICE_REFUSED = "DEVICE_CREDENTIAL_REFUSED";

// Registered before the key plugin, so it refuses before a key is spent.
const guard: BetterAuthPlugin = {
	id: "device-guard",
	hooks: {
		before: [
			{
				matcher: (ctx) =>
					deviceCredential(ctx.headers) !== null &&
					!DEVICE_ENDPOINTS.has(ctx.path ?? ""),
				handler: createAuthMiddleware(async () => {
					throw new APIError("FORBIDDEN", {
						code: DEVICE_REFUSED,
						message: "A device credential cannot call this endpoint.",
					});
				}),
			},
		],
	},
};

export function devicePlugins(): BetterAuthPlugin[] {
	return [
		guard,
		apiKey({
			defaultPrefix: DEVICE_KEY_PREFIX,
			defaultKeyLength: KEY_LENGTH,
			requireName: true,
			maximumNameLength: DEVICE_NAME_MAX,
			enableMetadata: false,
			// The key stands in for the session on `get-session`.
			enableSessionForAPIKeys: true,
			customAPIKeyGetter: (ctx) => deviceCredential(ctx.headers),
			rateLimit: { enabled: true, ...RATE_LIMIT },
			keyExpiration: {
				defaultExpiresIn: null,
				minExpiresIn: 1,
				maxExpiresIn: DEVICE_EXPIRES_MAX_DAYS,
			},
		}),
	];
}
