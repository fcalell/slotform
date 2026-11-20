import { createClient } from "@slotform/api/client";
import { createApiQueryUtils } from "@slotform/query/tanstack-query";
import type { AppRouter } from "../../../.slotform/worker";

const api = createClient<AppRouter>();
export const orpc = createApiQueryUtils(api);
