import type { Fixtures } from "@slotform/screens/fixtures";
import { session, user } from "./screens-session.ts";
import {
	DEVICE_KEY_LENGTH,
	DEVICE_KEY_PREFIX,
	type Device,
	type OAuthGrant,
} from "./worker/outputs.ts";
import type {
	deviceProcedures,
	emailOtpProcedures,
	magicLinkProcedures,
	oauthProcedures,
	organizationProcedures,
	sessionProcedures,
} from "./worker/procedures.ts";

// The MCP clients a member's list shows: one with a name and an address, one
// known by its client id alone.
const grants: OAuthGrant[] = [
	{
		id: "grant_claude",
		name: "Claude",
		uri: "https://claude.ai",
		organizationId: "org_screens",
		scopes: ["mcp", "offline_access"],
		createdAt: new Date("2026-02-12T10:00:00.000Z"),
	},
	{
		id: "grant_inspector",
		name: "https://inspector.example/client.json",
		uri: null,
		organizationId: "org_screens",
		scopes: ["mcp"],
		createdAt: new Date("2026-02-01T08:00:00.000Z"),
	},
];

// The device keys a member's list shows in the screens workbench: one in use,
// one never used, one that expired, so a list draws each of its forms.
const devices: Device[] = [
	{
		id: "device_studio",
		name: "Studio laptop",
		start: `${DEVICE_KEY_PREFIX}stud`,
		createdAt: new Date("2026-02-10T09:00:00.000Z"),
		expiresAt: null,
		lastUsedAt: new Date("2026-02-28T18:30:00.000Z"),
	},
	{
		id: "device_booth",
		name: "Booth laptop",
		start: `${DEVICE_KEY_PREFIX}boot`,
		createdAt: new Date("2026-02-20T09:00:00.000Z"),
		expiresAt: new Date("2099-01-01T00:00:00.000Z"),
		lastUsedAt: null,
	},
	{
		id: "device_old",
		name: "Old desktop",
		start: `${DEVICE_KEY_PREFIX}oldd`,
		createdAt: new Date("2025-06-01T09:00:00.000Z"),
		expiresAt: new Date("2025-12-01T09:00:00.000Z"),
		lastUsedAt: new Date("2025-11-30T12:00:00.000Z"),
	},
];

const organization = {
	id: "org_screens",
	name: "Studio",
	slug: "studio",
	createdAt: new Date("2026-01-05T09:00:00.000Z"),
	logo: null,
	metadata: undefined,
};

const activeOrganization = { ...organization, members: [], invitations: [] };

// The workbench's `auth.*` fixtures: docs/architecture/plugins/auth.md, "Screens".
const fixtures = {
	auth: {
		session: () => ({ session, user }),
		// The sign-in steps, answered as a sent code or link and a verified code.
		signIn: {
			sendOtp: () => ({ success: true }),
			verifyOtp: () => ({ token: session.token, user }),
			magicLink: () => ({ status: true }),
		},
		signOut: () => ({ success: true, url: undefined, redirect: undefined }),
		// The client an MCP connect page asks consent for.
		oauth: {
			client: () => ({
				client_id: "client_screens",
				client_name: "Claude",
				client_uri: "https://claude.ai",
			}),
			consent: () => ({ redirect: true, url: "https://example.com/callback" }),
			grants: {
				list: (): OAuthGrant[] => grants,
				revoke: () => undefined,
			},
		},
		user: { update: () => ({ status: true }) },
		organization: {
			list: () => [organization],
			setActive: () => activeOrganization,
			create: () => ({ ...activeOrganization, metadata: undefined }),
			delete: () => organization,
			invitations: {
				create: ({ email, role }) => ({
					id: "invitation_screens",
					organizationId: organization.id,
					email,
					role,
					status: "pending" as const,
					inviterId: user.id,
					expiresAt: new Date("2099-01-01T00:00:00.000Z"),
					createdAt: new Date("2026-03-01T09:00:00.000Z"),
				}),
			},
		},
		devices: {
			list: (): Device[] => devices,
			// The one key the answer shows, as the member copies it.
			create: ({ name }) => ({
				device: {
					id: "device_new",
					name,
					start: `${DEVICE_KEY_PREFIX}scre`,
					createdAt: new Date("2026-03-01T09:00:00.000Z"),
					expiresAt: null,
					lastUsedAt: null,
				},
				key: `${DEVICE_KEY_PREFIX}${"screens".padEnd(DEVICE_KEY_LENGTH, "0123456789abcdef")}`,
			}),
			revoke: () => ({ success: true }),
		},
	},
} satisfies Fixtures<{
	auth: ReturnType<typeof sessionProcedures> &
		ReturnType<typeof deviceProcedures> &
		ReturnType<typeof oauthProcedures> & {
			signIn: ReturnType<typeof emailOtpProcedures> &
				ReturnType<typeof magicLinkProcedures>;
			organization: ReturnType<typeof organizationProcedures>["organization"];
		};
}>;

export default fixtures;
