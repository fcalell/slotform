// Wire contract: docs/architecture/plugins/api.md, "Wire contract". Import-free so a client bundle never pulls in `procedure.ts`.
export const STACK_READS_HEADER = "x-stack-reads";
export const STACK_WRITES_HEADER = "x-stack-writes";

// Not found: docs/architecture/plugins/api.md, "Not found".
export const STACK_NOT_FOUND_HEADER = "x-stack-not-found";

// Exposed headers: docs/architecture/plugins/api.md, "Entity headers".
export const STACK_EXPOSED_HEADERS = [
	STACK_READS_HEADER,
	STACK_WRITES_HEADER,
	STACK_NOT_FOUND_HEADER,
] as const;

// Entity names: docs/architecture/plugins/api.md, "Entities".
export const ENTITY_NAME_RE = /^[A-Za-z0-9_.-]+$/;

// Org-rules path: docs/architecture/plugins/api.md, "Framework-owned paths".
export const ORG_RULES_PATH = ["auth", "orgRules"] as const;

// Scope lookups path: docs/architecture/plugins/api.md, "Framework-owned paths".
export const SCOPE_ROUTES_PATH = ["auth", "scope"] as const;

// Listener contract: docs/architecture/plugins/api.md, "Listener contract".
export const LISTENER_ENV = "STACK_LISTENER";
export const ORIGIN_ENV = "STACK_ORIGIN";

// The origin the request's listener serves, or null when the env names none.
export function listenerOrigin(env: unknown): string | null {
	const value = (env as Record<string, unknown> | null | undefined)?.[
		ORIGIN_ENV
	];
	return typeof value === "string" && value !== "" ? value : null;
}
