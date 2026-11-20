import { createClient } from "@slotform/api/client";
import { createVersionGatedFetch } from "@slotform/expo/client";
import { createApiQueryUtils } from "@slotform/query/tanstack-query";
// The emitted worker's router type, imported type-only: plugins/expo/guide/api-client.md.
import type { AppRouter } from "../../.slotform/worker";

// The typed RPC client wired into the app. The one app-specific value is `url`, the deployed API
// worker: set EXPO_PUBLIC_API_URL in `.env`; the localhost fallback targets the local worker in development.
// The version gate: docs/architecture/plugins/expo.md, "Version gate".
const client = createClient<AppRouter>({
	url: `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787"}/rpc`,
	fetch: createVersionGatedFetch(),
});

export const orpc = createApiQueryUtils(client);
