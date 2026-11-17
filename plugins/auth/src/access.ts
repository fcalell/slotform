export interface Role {
	[resource: string]: readonly string[];
}

export function createAccessControl<
	T extends Record<string, readonly string[]>,
>(statements: T) {
	return {
		statements,
		newRole(
			permissions: {
				[K in keyof T]?: T[K][number][];
			},
		): Role {
			// `T[K][number][]` is a list of action names, which `Role` spells as `readonly string[]`.
			return permissions as Role;
		},
	};
}

export function getStatements(
	ac: { statements?: Record<string, readonly string[]> } | undefined,
): Record<string, readonly string[]> | undefined {
	return ac?.statements;
}

// Default organization statements: docs/architecture/slot-catalog.md, "`api.slots.*` (plugin-api)".
export const defaultOrgStatements = {
	organization: ["update", "delete"],
	member: ["create", "update", "delete"],
	invitation: ["create", "cancel"],
	team: ["create", "update", "delete"],
} as const;

const orgAc = createAccessControl(defaultOrgStatements);

export const defaultOrgRoles = {
	owner: orgAc.newRole({
		organization: ["update", "delete"],
		member: ["create", "update", "delete"],
		invitation: ["create", "cancel"],
		team: ["create", "update", "delete"],
	}),
	admin: orgAc.newRole({
		organization: ["update"],
		member: ["create", "update", "delete"],
		invitation: ["create", "cancel"],
		team: ["create", "update", "delete"],
	}),
	member: orgAc.newRole({
		organization: [],
		member: [],
		invitation: [],
		team: [],
	}),
} as const;
