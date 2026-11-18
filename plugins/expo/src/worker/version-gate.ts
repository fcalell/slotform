import type { MiddlewareHandler } from "hono";
import {
	CLIENT_BUILD_HEADER,
	CLIENT_PLATFORM_HEADER,
	VERSION_GATE_METRICS_BINDING,
} from "../version-gate-shared.ts";

// EAS build numbers are integers. `Number("")` is 0 and `parseInt("1.2.3")`
// is 1 — both would mis-gate a malformed/absent header — so the whole string
// must be digits before it's trusted.
const BUILD_NUMBER_RE = /^\d+$/;

// The auth surface is never walled: plugins/expo/guide/version-gate.md, "What it walls".
const AUTH_PREFIX = "/api/auth";

// Exact match or a real sub-path (`/rpc/trips.list`), not a mere prefix
// look-alike like `/rpcX`, which `startsWith("/rpc")` would wrongly match.
function isWithin(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isGatedPath(pathname: string, prefixes: string[]): boolean {
	if (isWithin(pathname, AUTH_PREFIX)) return false;
	return prefixes.some((prefix) => isWithin(pathname, prefix));
}

interface VersionGateOptions {
	ios: number;
	android: number;
	// Only paths inside the worker's prefixes are walled: docs/architecture/plugins/expo.md, "Version gate".
	prefixes: string[];
}

// Structural slice of Cloudflare's AnalyticsEngineDataset — the worker types
// aren't a dependency here, and only writeDataPoint is used.
interface MetricsDataset {
	writeDataPoint(point: {
		blobs?: string[];
		doubles?: number[];
		indexes?: string[];
	}): void;
}

function isMetricsDataset(value: unknown): value is MetricsDataset {
	return (
		typeof value === "object" &&
		value !== null &&
		"writeDataPoint" in value &&
		typeof value.writeDataPoint === "function"
	);
}

// Counts walled and fail-open (header-less / malformed) requests in the
// Analytics Engine dataset bound as `VERSION_GATE_METRICS_BINDING`: the canary
// that measures how many clients the gate cannot wall. An absent binding is no
// telemetry, never an error.
function writeMetric(
	env: unknown,
	event: "walled" | "headerless",
	platform: string | undefined,
	build: string | undefined,
): void {
	if (typeof env !== "object" || env === null) return;
	if (!(VERSION_GATE_METRICS_BINDING in env)) return;
	const dataset = env[VERSION_GATE_METRICS_BINDING];
	if (!isMetricsDataset(dataset)) return;
	try {
		dataset.writeDataPoint({
			blobs: [event, platform ?? "", build ?? ""],
			indexes: [event],
		});
	} catch {
		// Telemetry must never take down the request path.
	}
}

// The wall fails open: docs/architecture/plugins/expo.md, "Version gate".
export function versionGate(options: VersionGateOptions): MiddlewareHandler {
	return async (c, next) => {
		if (!isGatedPath(c.req.path, options.prefixes)) return next();

		const build = c.req.header(CLIENT_BUILD_HEADER);
		const platform = c.req.header(CLIENT_PLATFORM_HEADER);
		if (!build || !platform || !BUILD_NUMBER_RE.test(build)) {
			writeMetric(c.env, "headerless", platform, build);
			return next();
		}

		const floor =
			platform === "ios"
				? options.ios
				: platform === "android"
					? options.android
					: null;
		if (floor === null) {
			writeMetric(c.env, "headerless", platform, build);
			return next();
		}

		if (Number(build) < floor) {
			writeMetric(c.env, "walled", platform, build);
			return c.json(
				{
					code: "UPGRADE_REQUIRED",
					message: "A newer version of the app is required.",
				},
				426,
			);
		}

		return next();
	};
}
