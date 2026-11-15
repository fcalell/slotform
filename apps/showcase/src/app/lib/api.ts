import { createClient } from "@fcalell/plugin-api/client";
import { createApiQueryUtils } from "@fcalell/plugin-query/tanstack-query";
import type { AppRouter } from "../../../.stack/worker";

const api = createClient<AppRouter>();
export const orpc = createApiQueryUtils(api);
