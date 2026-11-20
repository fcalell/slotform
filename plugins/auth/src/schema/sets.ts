// The table set each option turns on, keyed by Better Auth model name, which is
// also its export name and its entity: docs/architecture/plugins/auth.md, "Schema tables".
import { apikey } from "./devices.ts";
import { account, session, user, verification } from "./index.ts";
import {
	jwks,
	oauthAccessToken,
	oauthClient,
	oauthClientAssertion,
	oauthClientResource,
	oauthConsent,
	oauthRefreshToken,
	oauthResource,
} from "./oauth.ts";
import { invitation, member, organization } from "./organization.ts";
import { passkey } from "./passkey.ts";

interface TableOptions {
	organization?: unknown;
	passkey?: unknown;
	mcp?: boolean;
	devices?: boolean;
}

const TABLE_SETS = [
	{
		option: null,
		module: "@slotform/auth/schema",
		tables: { account, session, user, verification },
	},
	{
		option: "organization",
		module: "@slotform/auth/schema/organization",
		tables: { invitation, member, organization },
	},
	{
		option: "passkey",
		module: "@slotform/auth/schema/passkey",
		tables: { passkey },
	},
	{
		option: "mcp",
		module: "@slotform/auth/schema/oauth",
		tables: {
			jwks,
			oauthAccessToken,
			oauthClient,
			oauthClientAssertion,
			oauthClientResource,
			oauthConsent,
			oauthRefreshToken,
			oauthResource,
		},
	},
	{
		option: "devices",
		module: "@slotform/auth/schema/devices",
		tables: { apikey },
	},
] as const satisfies readonly {
	option: keyof TableOptions | null;
	module: string;
	tables: Record<string, unknown>;
}[];

export type TableSet = (typeof TABLE_SETS)[number];

// The sets the options turn on, the identity set first.
export function tableSetsOf(options: TableOptions): TableSet[] {
	return TABLE_SETS.filter(
		(set) => set.option === null || Boolean(options[set.option]),
	);
}
