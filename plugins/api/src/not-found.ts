import { ORPCError } from "@orpc/client";

// Not found: docs/architecture/plugins/api.md, "Not found".
export function isNotFound(error: unknown): boolean {
	return error instanceof ORPCError && error.code === "NOT_FOUND";
}
