// Wire contract: docs/architecture/plugins/api.md, "Wire contract". Import-free so a client bundle never pulls in `procedure.ts`.
export const SLOTFORM_READS_HEADER = "x-slotform-reads";
export const SLOTFORM_WRITES_HEADER = "x-slotform-writes";

// Not found: docs/architecture/plugins/api.md, "Not found".
export const SLOTFORM_NOT_FOUND_HEADER = "x-slotform-not-found";

// Exposed headers: docs/architecture/plugins/api.md, "Entity headers".
export const SLOTFORM_EXPOSED_HEADERS = [
	SLOTFORM_READS_HEADER,
	SLOTFORM_WRITES_HEADER,
	SLOTFORM_NOT_FOUND_HEADER,
] as const;

// Entity names: docs/architecture/plugins/api.md, "Entities".
export const ENTITY_NAME_RE = /^[A-Za-z0-9_.-]+$/;

// Org-rules path: docs/architecture/plugins/api.md, "Framework-owned paths".
export const ORG_RULES_PATH = ["auth", "orgRules"] as const;

// Scope lookups path: docs/architecture/plugins/api.md, "Framework-owned paths".
export const SCOPE_ROUTES_PATH = ["auth", "scope"] as const;

// Listener contract: docs/architecture/plugins/api.md, "Listener contract".
export const LISTENER_ENV = "SLOTFORM_LISTENER";
export const ORIGIN_ENV = "SLOTFORM_ORIGIN";

// The origin the request's listener serves, or null when the env names none.
export function listenerOrigin(env: unknown): string | null {
	const value = (env as Record<string, unknown> | null | undefined)?.[
		ORIGIN_ENV
	];
	return typeof value === "string" && value !== "" ? value : null;
}
