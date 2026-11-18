import { createClient } from "@fcalell/plugin-api/client";
import { createVersionGatedFetch } from "@fcalell/plugin-expo/client";
import { createApiQueryUtils } from "@fcalell/plugin-query/tanstack-query";
// Imported type-only, so no worker code enters the bundle: node_modules/@fcalell/plugin-expo/guide/api-client.md.
import type { AppRouter } from "../../.stack/worker";

// The typed RPC client. Set EXPO_PUBLIC_API_URL in `.env` to the deployed worker; the URL and the
// version headers `fetch` stamps: node_modules/@fcalell/plugin-expo/guide/api-client.md.
const client = createClient<AppRouter>({
	url: `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787"}/rpc`,
	fetch: createVersionGatedFetch(),
});

export const orpc = createApiQueryUtils(client);
