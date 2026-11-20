import { isIP } from "node:net";
import { LISTENER_ENV, ORIGIN_ENV } from "@slotform/api/wire";

// The Host rule and the env a listener gives the worker: docs/architecture/plugins/node.md, "Hosts and listeners".

// A Host header's characters: a name, an IPv4 address or a bracketed IPv6
// one, and a port. Anything else (a path, userinfo, a space) is refused
// before it is parsed.
const HOST_SHAPE = /^[a-z0-9.\-[\]:]+$/i;

const LOCAL_NAMES = new Set(["localhost", "[::1]"]);

// The Host header as the URL parser normalises it for `protocol` (lowercased,
// the scheme's default port dropped), or null for a malformed one.
export function hostOf(header: string, protocol: string): string | null {
	if (!HOST_SHAPE.test(header)) return null;
	try {
		const url = new URL(`${protocol}//${header}`);
		return url.pathname === "/" && url.username === "" ? url.host : null;
	} catch {
		return null;
	}
}

// An env value as the origin a listener serves: an http or https URL's
// origin, or null when unset or anything else.
export function originOf(value: unknown): string | null {
	if (typeof value !== "string" || value === "") return null;
	try {
		const url = new URL(value);
		if (url.protocol !== "http:" && url.protocol !== "https:") return null;
		return url.origin;
	} catch {
		return null;
	}
}

// The Host a socket address answers to literally (`127.0.0.1:8788`,
// `[::1]:8788`): a request addressed to the bound socket itself is never a
// rebinding.
export function boundHost(
	host: string | undefined,
	port: number,
): string | null {
	if (host === undefined) return null;
	const name = host.includes(":") ? `[${host}]` : host;
	return hostOf(`${name}:${port}`, "http:");
}

// Whether the process runs under `slotform dev`, which sets `SLOTFORM_DEV=1`.
export function isDev(env: Record<string, string | undefined>): boolean {
	return env.SLOTFORM_DEV === "1";
}

// The main listener's rule: docs/architecture/plugins/node.md, "Hosts and listeners".
export function mainAdmits(input: {
	host: string | undefined;
	origins: readonly string[] | undefined;
	bound: string | null;
	dev: boolean;
}): boolean {
	const { host, origins, bound, dev } = input;
	if (origins === undefined || origins.includes("*")) return true;
	if (host === undefined) return false;
	for (const origin of origins) {
		let url: URL;
		try {
			url = new URL(origin);
		} catch {
			// An entry that is not a URL names no Host, so it admits none.
			continue;
		}
		if (hostOf(host, url.protocol) === url.host) return true;
	}
	const literal = hostOf(host, "http:");
	if (literal === null) return false;
	if (bound !== null && literal === bound) return true;
	if (!dev) return false;
	const name = new URL(`http://${literal}`).hostname;
	return (
		LOCAL_NAMES.has(name) ||
		name.endsWith(".localhost") ||
		isIP(name.replace(/^\[|\]$/g, "")) !== 0
	);
}

// A further listener's rule: the Host of the one origin it serves, and
// nothing while it serves none.
export function listenerAdmits(
	host: string | undefined,
	origin: string | null,
): boolean {
	if (host === undefined || origin === null) return false;
	const url = new URL(origin);
	return hostOf(host, url.protocol) === url.host;
}

// The env the worker sees on a further listener: the server's env, read
// live, with the listener's name and origin over it. One object per origin,
// so a runtime that builds once per env (auth) builds once per origin, and a
// changed origin builds afresh.
export function listenerEnv(
	base: Record<string, string | undefined>,
	name: string,
	origin: string,
): Record<string, string | undefined> {
	const own: Record<string, string> = {
		[LISTENER_ENV]: name,
		[ORIGIN_ENV]: origin,
	};
	return new Proxy(base, {
		get: (target, key) =>
			typeof key === "string" && Object.hasOwn(own, key)
				? own[key]
				: Reflect.get(target, key),
		has: (target, key) =>
			(typeof key === "string" && Object.hasOwn(own, key)) ||
			Reflect.has(target, key),
		ownKeys: (target) => [
			...new Set([...Reflect.ownKeys(target), ...Object.keys(own)]),
		],
		getOwnPropertyDescriptor: (target, key) =>
			typeof key === "string" && Object.hasOwn(own, key)
				? {
						value: own[key],
						enumerable: true,
						configurable: true,
						writable: false,
					}
				: Reflect.getOwnPropertyDescriptor(target, key),
	});
}
