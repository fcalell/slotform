import type { PasskeyOptions } from "@better-auth/passkey";
import { listenerOrigin } from "@fcalell/plugin-api/wire";

// The base URL Better Auth is built with: docs/architecture/plugins/auth.md, "Origins and cookies".
export function appUrlOf(
	env: Record<string, unknown>,
	appUrlVar: string,
): string {
	// The generated worker's `envChecks` asserts the URL var is set.
	return listenerOrigin(env) ?? (env[appUrlVar] as string);
}

// Same predicate plugin-api puts on `ctx._devMode`, read straight off env:
// `buildAuth` runs per env, before any request context exists.
export function isDevMode(env: Record<string, unknown>): boolean {
	return env.STACK_DEV === "1";
}

export interface BakedPasskey {
	rpID: string;
	rpName: string;
	origin: string | string[];
	// The dev origins, swapped in with `rpID: "localhost"` under STACK_DEV.
	devOrigin?: string[];
	authenticatorSelection?: PasskeyOptions["authenticatorSelection"];
}

// The passkey options for one instance. Under STACK_DEV a localhost
// ceremony matches neither production value, so dev swaps in both. On a
// listener with an origin of its own, a ceremony runs at that origin: it
// joins the accepted origins, and when the baked relying party (the app's
// domain) is not that host or a parent of it, which no ceremony there could
// match, the host becomes the relying party.
export function passkeyFor(
	passkey: BakedPasskey,
	env: Record<string, unknown>,
): Omit<BakedPasskey, "devOrigin"> {
	const { devOrigin, ...production } = passkey;
	if (devOrigin && isDevMode(env)) {
		return { ...production, rpID: "localhost", origin: devOrigin };
	}
	const own = listenerOrigin(env);
	if (own === null) return production;
	const host = new URL(own).hostname;
	const covered =
		host === production.rpID || host.endsWith(`.${production.rpID}`);
	const baked = Array.isArray(production.origin)
		? production.origin
		: [production.origin];
	return {
		...production,
		rpID: covered ? production.rpID : host,
		origin: [...new Set([...baked, own])],
	};
}
