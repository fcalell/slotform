import type { EnvSpec } from "@fcalell/plugin-api/types";
import { z } from "zod";

export const cloudflareOptionsSchema = z.object({}).optional();

export type CloudflareOptions = z.input<typeof cloudflareOptionsSchema>;

export type WranglerBindingSpec =
	| {
			kind: "d1";
			binding: string;
			databaseName: string;
			databaseId: string;
			migrationsDir?: string;
	  }
	| { kind: "kv"; binding: string; id: string }
	| { kind: "r2"; binding: string; bucketName: string }
	| { kind: "analytics_engine"; binding: string; dataset: string }
	| {
			kind: "rate_limiter";
			binding: string;
			simple: { limit: number; period: number };
	  }
	| {
			kind: "queue";
			binding: string;
			queue: string;
			consumer?: {
				maxBatchSize: number;
				maxBatchTimeout: number;
				maxRetries: number;
			};
	  }
	| { kind: "var"; name: string; value: string };

export type WranglerRouteSpec = {
	pattern: string;
	zone?: string;
	customDomain?: boolean;
};

export interface CodegenWranglerPayload {
	bindings: WranglerBindingSpec[];
	routes: WranglerRouteSpec[];
	vars: Record<string, string>;
	secrets: EnvSpec[];
	compatibilityDate: string;
	compatibilityFlags: string[];
	// The web client's build directory, relative to the project root; null
	// when no plugin builds one.
	clientDir: string | null;
	routePrefixes: string[];
	// Whether `src/worker/queue.ts` / `src/worker/scheduled.ts` exist: the root
	// file's `[[queues.consumers]]` and `[triggers] crons` are checked against them.
	queueHandler: boolean;
	scheduledHandler: boolean;
	// A `stack screens serve` run's config: its own entry, its own copy of the
	// client build (absolute), and the `/fixture` controls on the worker's paths.
	serve?: { main: string; clientDir: string };
}
