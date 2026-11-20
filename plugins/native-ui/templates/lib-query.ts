import { createQueryClient } from "@slotform/query/tanstack-query";

// The TanStack Query client wired into the app by `<QueryProvider>` (see the
// generated `.slotform/entry.tsx`). The starter uses mobile-friendly defaults
// (single retry, short stale window); pass a `QueryClientConfig` here to tune.
export const queryClient = createQueryClient();
