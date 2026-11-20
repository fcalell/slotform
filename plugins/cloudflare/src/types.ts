import type { EnvSpec } from "@slotform/api/types";
import { z } from "zod";

export const cloudflareOptionsSchema = z.object({}).optional();

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

export interface CodegenWranglerPayload {
	bindings: WranglerBindingSpec[];
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
	serve?: ServeConfig;
}

// A `slotform screens serve` run's config: its own entry, its own copy of the
// client build (absolute, null without a web client), and the `/fixture`
// controls on the worker's paths.
export interface ServeConfig {
	main: string;
	clientDir: string | null;
}
