import { expo } from "@better-auth/expo";
import { passkey } from "@better-auth/passkey";
import {
	ORG_RULES_PATH,
	type RateLimitBinding,
	SCOPE_ROUTES_PATH,
} from "@slotform/api/procedure";
import type { RuntimePlugin } from "@slotform/cli/runtime";
import type { SQLiteColumn } from "@slotform/db/orm";
import type { BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import {
	role as buildAcRole,
	createAccessControl as createBetterAuthAccessControl,
} from "better-auth/plugins/access";
import { emailOTP } from "better-auth/plugins/email-otp";
import { magicLink } from "better-auth/plugins/magic-link";
import { organization } from "better-auth/plugins/organization";
import { defaultOrgRoles } from "../access.ts";
import type { SessionOf, SessionUser } from "../infer.ts";
import { tableSetsOf } from "../schema/sets.ts";
import {
	type Membership,
	organization as organizationScope,
	type Scope,
} from "../scope.ts";
import type {
	AuthCallbackPayloads,
	AuthUser,
	OtpType,
	ResolvedSocialProvider,
	SocialProviderName,
} from "../types.ts";
import {
	AUTH_PREFIX,
	CLIENT_IP_HEADER,
	OAUTH_DISCOVERY_PREFIXES,
} from "../types.ts";
import { devicePlugins } from "./devices.ts";
import {
	appUrlOf,
	type BakedPasskey,
	isDevMode,
	passkeyFor,
} from "./listener.ts";
import {
	createOAuth,
	type GrantAdapter,
	mcpPlugins,
	type OAuth,
} from "./oauth.ts";
import {
	type AuthProcedureFactory,
	bySlugProcedure,
	deviceProcedures,
	emailOtpOauthProcedures,
	emailOtpProcedures,
	magicLinkOauthProcedures,
	magicLinkProcedures,
	OTP_LENGTH,
	oauthProcedures,
	organizationProcedures,
	orgRulesProcedure,
	type ScopeLookup,
	sessionProcedures,
	setActiveOauthProcedure,
} from "./procedures.ts";
import { type AuthRateLimiter, checkRateLimit } from "./rate-limit.ts";
import { refuseReservedSlug, reservedSlugCheck } from "./reserved-slugs.ts";
import { publishSessionEnded } from "./session-ended.ts";
import { type PolicyAdapter, signUpPolicy } from "./sign-up-policy.ts";
import { createTenancy, type Tenancy } from "./tenancy.ts";

// Routes `devices` takes off HTTP: docs/architecture/plugins/auth.md, "Devices".
const DEVICE_DISABLED_PATHS = [
	"/api-key/create",
	"/api-key/delete",
	"/api-key/delete-all-expired-api-keys",
	"/api-key/get",
	"/api-key/list",
	"/api-key/update",
	"/api-key/verify",
];

// The routes an authorization server serves that the app does not use: the
// session-minted JWT, and the consumer's own listing and revocation of grants
// that `consent` rows are reached through, never through a session.
const MCP_DISABLED_PATHS = [
	"/token",
	"/oauth2/get-consent",
	"/oauth2/get-consents",
	"/oauth2/update-consent",
	"/oauth2/delete-consent",
];

// Better Auth helpers re-exported: docs/architecture/plugins/auth.md, "Worker runtime".
export type { BetterAuthPlugin } from "better-auth";
export {
	APIError,
	createAuthEndpoint,
	createAuthMiddleware,
	getSessionFromCtx,
	isAPIError,
} from "better-auth/api";
export { setSessionCookie } from "better-auth/cookies";
export { customSession } from "better-auth/plugins/custom-session";

export type { OtpType } from "../types.ts";
export type { OAuth, VerifiedAgent } from "./oauth.ts";
// The `auth.*` procedures' types name these, so a declaration emit of the
// consumer's generated `.slotform/worker.ts` names them through this subpath.
export type {
	AcceptedInvitation,
	ActiveOrganization,
	CreatedDevice,
	Device,
	Invitation,
	InvitationStatus,
	OAuthClientPublic,
	OAuthGrant,
	OrganizationMember,
	RejectedInvitation,
} from "./outputs.ts";
export type { AuthProcedureFactory, OAuthRedirect } from "./procedures.ts";
// The request context carries a `Tenancy` and an `AuthRateLimiter`, so a declaration
// emit of the consumer's generated `.slotform/procedure.ts` names them through this subpath.
export type { AuthRateLimiter } from "./rate-limit.ts";
export type { Tenancy } from "./tenancy.ts";

// Consumer-implemented hooks: docs/architecture/plugins/auth.md, "Callbacks".
export interface AuthCallbacks<TEnv = unknown> {
	// Required while `emailOtp` is on: the runtime refuses to build without it.
	sendOTP?(
		payload: AuthCallbackPayloads<TEnv>["sendOTP"],
	): void | Promise<void>;
	// Required while `magicLink` is on: the runtime refuses to build without it.
	sendMagicLink?(
		payload: AuthCallbackPayloads<TEnv>["sendMagicLink"],
	): void | Promise<void>;
	sendInvitation?(
		payload: AuthCallbackPayloads<TEnv>["sendInvitation"],
	): void | Promise<void>;
	// Runs before better-auth deletes the row, and only when
	// `user.deleteUser` is on. Throw to refuse the deletion (an `APIError`
	// surfaces its own status; anything else is a 500). Revocation, storage
	// cleanup, and PII scrubbing all belong here.
	beforeDelete?(
		payload: AuthCallbackPayloads<TEnv>["beforeDelete"],
	): void | Promise<void>;
	// The passwordless-safe deletion path. When implemented, POST
	// /delete-user emails `url` (a confirmation link) instead of deleting,
	// and the deletion happens on the link's callback with no session
	// freshness requirement. Without it, a passwordless consumer is pushed
	// to `session.freshAge: 0`, which lets any stolen session cookie of any
	// age delete the account in one request.
	sendDeleteVerification?(
		payload: AuthCallbackPayloads<TEnv>["sendDeleteVerification"],
	): void | Promise<void>;
	// Replaces the OTP better-auth would generate. Return `undefined` to fall
	// back to the default for that request, which is how a fixed review-account
	// code coexists with real codes. Synchronous: better-auth reads the return
	// value directly. Runs for every `OtpType` (sign-in, verification,
	// forget-password, change-email), so key an override on `type` as well as
	// the email; method syntax keeps payloads bivariant, so a handler that
	// narrows `type` compiles but still receives all four at runtime.
	generateOTP?(
		payload: AuthCallbackPayloads<TEnv>["generateOTP"],
	): string | undefined;
	// The consumer's own better-auth plugins, registered after the
	// framework's: a sign-in flow the framework does not ship (endpoints,
	// tables, hooks) is written here. A table a plugin declares lives in the
	// consumer's schema under the model's name.
	plugins?: BetterAuthPlugin[];
}

export interface AuthRuntimeInput {
	secretVar: string;
	appUrlVar: string;
	callbacks?: AuthCallbacks;
	sameSite?: "strict" | "lax" | "none";
	trustedOrigins?: string[];
	// Dev-server origins, applied only when the worker runs with SLOTFORM_DEV.
	devTrustedOrigins?: string[];
	cookies?: { prefix?: string; domain?: string };
	session?: {
		expiresIn?: number;
		updateAge?: number;
		freshAge?: number;
	};
	user?: {
		deleteUser?: boolean;
	};
	// Codegen reduces the consumer's `{ ac, roles }` to plain records: the
	// statements of `ac` and each role's grants.
	organization?:
		| boolean
		| {
				statements?: Record<string, readonly string[]>;
				roles?: Record<string, Record<string, readonly string[]>>;
		  };
	// Who may create an account; `open` when absent.
	signUp?: "open" | "invite" | "first";
	// On by default; `false` drops the email-OTP plugin (OAuth-only consumers).
	emailOtp?: boolean;
	// Off by default; on, adds the magic-link plugin and requires `sendMagicLink`.
	magicLink?: boolean;
	// Resolved provider → env-var references (var names, never secrets — the
	// runtime reads credentials from `env` at request time).
	socialProviders?: Partial<Record<SocialProviderName, ResolvedSocialProvider>>;
	// Set by codegen for `expo`: docs/architecture/plugins/auth.md, "Native client".
	expo?: boolean;
	// Set by codegen for `mcp`: docs/architecture/plugins/auth.md, "MCP OAuth".
	mcp?: boolean;
	// Set by codegen when the consumer enables `devices`: device credentials,
	// bearer keys that stand in for their member's session.
	devices?: boolean;
	// Set by codegen for `passkey`: docs/architecture/plugins/auth.md, "Passkeys".
	passkey?: BakedPasskey;
	// Wrangler rate-limiter binding names: docs/architecture/plugins/auth.md, "Rate limiting".
	rateLimiter?: {
		ip: { binding: string };
		email: { binding: string };
		agent?: { binding: string };
	};
	// Slugs an organization may not take: docs/architecture/plugins/auth.md, "Reserved slugs".
	reservedSlugs?: readonly string[];
	// The consumer's scopes module: docs/architecture/plugins/auth.md, "Scopes".
	scopes?: Record<string, unknown>;
}

// Structural surface of the Better Auth instance: docs/architecture/plugins/auth.md, "Worker runtime".
export type AuthApi = {
	getSession: (opts: { headers: Headers }) => Promise<{
		user: Record<string, unknown>;
		session: Record<string, unknown>;
	} | null>;
};

type TenancyContext<TOptions> = TOptions extends { organization: infer O }
	? O extends undefined | false
		? object
		: { tenancy: Tenancy }
	: object;

// The OAuth capability exists only with `mcp` on.
type OAuthContext<TOptions> = TOptions extends { mcp: true }
	? { oauth: OAuth }
	: object;

// `$Infer.Session` and `TOptions`: docs/architecture/plugins/auth.md, "Worker runtime".
export interface AuthInstance<
	TOptions extends AuthRuntimeInput = AuthRuntimeInput,
> {
	handler: (request: Request) => Promise<Response>;
	api: AuthApi;
	$Infer: {
		Session: {
			user: SessionUser;
			session: SessionOf<TOptions>;
		};
	};
}

function appOrigin(url: unknown): string[] {
	try {
		return typeof url === "string" ? [new URL(url).origin] : [];
	} catch {
		// A URL var that does not parse names no origin; Better Auth refuses it as
		// `baseURL` when the instance builds.
		return [];
	}
}

// The origins the instance trusts, which a sign-in link's redirect is held to:
// the baked list, plus the dev-server origins under SLOTFORM_DEV. The instance
// is built with the list alone: Better Auth trusts its own base URL besides,
// so a redirect check names that origin too.
function trustedOriginsOf(
	options: Pick<AuthRuntimeInput, "trustedOrigins" | "devTrustedOrigins">,
	env: Record<string, unknown>,
): string[] {
	return [
		...(options.trustedOrigins ?? []),
		...(isDevMode(env) ? (options.devTrustedOrigins ?? []) : []),
	];
}

// A callback an option on requires: the runtime refuses to build without it.
function missingCallback(callback: string, option: string, off: string): Error {
	return new Error(
		`auth: \`${option}\` is on but the callbacks file defines no \`${callback}\`. Implement \`${callback}\` in the auth callbacks file (\`auth.slots.callbackFile\`), or set \`${off}\`.`,
	);
}

// The grants the roles table resolves: the consumer's, else better-auth's own.
function organizationRoles(options: AuthRuntimeInput): Record<string, unknown> {
	return typeof options.organization === "object" && options.organization.roles
		? options.organization.roles
		: defaultOrgRoles;
}

function buildAuth(
	env: Record<string, unknown>,
	db: unknown,
	options: AuthRuntimeInput,
) {
	// The options schema refuses `mcp` and a closed `signUp` without
	// `organization`, so the baked options never hold either alone.
	const plugins: BetterAuthPlugin[] = [];
	// The grant deletions of the organization hooks run without an endpoint
	// context, so they reach the instance through this once it exists.
	let authContext: Promise<{ adapter: GrantAdapter }> | undefined;
	const mcpSetup = options.mcp
		? mcpPlugins({
				appUrl: appUrlOf(env, options.appUrlVar),
				db,
				roles: organizationRoles(options),
				membership: consumerMembership(options.scopes),
				context: () => {
					if (!authContext) throw new Error("auth: auth is not built");
					return authContext;
				},
			})
		: undefined;

	const policy =
		options.signUp === "invite" || options.signUp === "first"
			? signUpPolicy(
					options.signUp,
					// `GrantAdapter` and `PolicyAdapter` are two slices of Better Auth's one adapter.
					async () => (await authContext)?.adapter as unknown as PolicyAdapter,
				)
			: undefined;
	if (policy) plugins.push(policy.plugin);

	if (options.emailOtp !== false) {
		const sendOTP = options.callbacks?.sendOTP;
		if (!sendOTP)
			throw missingCallback("sendOTP", "emailOtp", "emailOtp: false");
		// The fixture member's code under `slotform screens serve` (which sets
		// `SLOTFORM_DEV`): the one address's code is fixed, every other's is its own.
		const serveCode =
			isDevMode(env) && typeof env.SLOTFORM_SERVE_CODE === "string"
				? env.SLOTFORM_SERVE_CODE
				: undefined;
		plugins.push(
			emailOTP({
				sendVerificationOTP: async ({ email, otp, type }) => {
					await sendOTP({ email, code: otp, type, env });
				},
				// The key must be absent when the consumer has no callback:
				// better-auth spreads these options over its defaults, so an
				// explicit `generateOTP: undefined` overwrites the default
				// generator and crashes every OTP send.
				...(options.callbacks?.generateOTP || serveCode
					? {
							generateOTP: ({
								email,
								type,
							}: {
								email: string;
								type: OtpType;
							}) =>
								email === env.SLOTFORM_SERVE_EMAIL
									? serveCode
									: options.callbacks?.generateOTP?.({ email, type, env }),
						}
					: {}),
				// Pinned, not options (the length is `OTP_LENGTH`, which `verifyOtp`'s input shares): the attempt cap is the actual brute-force
				// gate (the verify path is only IP-limited), so it must never
				// drift on a dependency bump.
				otpLength: OTP_LENGTH,
				expiresIn: 300,
				allowedAttempts: 3,
			}),
		);
	}

	if (options.magicLink) {
		const sendMagicLink = options.callbacks?.sendMagicLink;
		if (!sendMagicLink)
			throw missingCallback("sendMagicLink", "magicLink", "magicLink: false");
		plugins.push(
			magicLink({
				sendMagicLink: async ({ email, url, token }) => {
					await sendMagicLink({ email, url, token, env });
				},
				// Pinned, not options, as the OTP's are: a dependency bump never
				// moves them. A token is spent on its first verification, so
				// `allowedAttempts` is never passed.
				expiresIn: 300,
				disableSignUp: false,
				storeToken: "hashed",
			}),
		);
	}

	if (options.organization) {
		const sendInvitation = options.callbacks?.sendInvitation;
		if (!sendInvitation)
			throw missingCallback(
				"sendInvitation",
				"organization",
				"organization: false",
			);
		const orgConfig =
			typeof options.organization === "object" ? options.organization : {};
		// better-auth's org plugin reads `.authorize()`/`.statements` off each
		// `roles` entry directly (permission.mjs's `hasPermissionFn`), not the
		// bare `{resource: actions[]}` records codegen bakes, so every role is
		// rebuilt through better-auth's own access control. Its `ac` is read
		// only under dynamic access control, which stays off.
		const ac = orgConfig.statements
			? createBetterAuthAccessControl(orgConfig.statements)
			: undefined;
		const grantsByRole: Record<
			string,
			Record<string, readonly string[]>
		> = orgConfig.roles ?? defaultOrgRoles;
		const reserved = new Set(options.reservedSlugs ?? []);
		plugins.push(
			reservedSlugCheck(reserved),
			organization({
				// better-auth checks a slug is free, never that the app's own
				// routes leave it free: both writes that set one refuse it here.
				organizationHooks: {
					beforeCreateOrganization: async ({ organization }) =>
						refuseReservedSlug(reserved, organization.slug),
					beforeUpdateOrganization: async ({ organization }) =>
						refuseReservedSlug(reserved, organization.slug),
					// With `mcp`, a member's grants end with their membership.
					...mcpSetup?.organizationHooks,
				},
				// biome-ignore lint/suspicious/noExplicitAny: AccessControl type is internal to better-auth.
				ac: ac as any,
				roles: Object.fromEntries(
					Object.entries(grantsByRole).map(([name, grants]) => [
						name,
						buildAcRole(grants),
					]),
					// biome-ignore lint/suspicious/noExplicitAny: roles shape is user-provided.
				) as any,
				async sendInvitationEmail(data) {
					await sendInvitation({
						invitationId: data.id,
						email: data.email,
						role: data.role,
						organization: {
							id: data.organization.id,
							name: data.organization.name,
							slug: data.organization.slug,
						},
						inviter: {
							id: data.inviter.user.id,
							name: data.inviter.user.name,
							email: data.inviter.user.email,
						},
						env,
					});
				},
			}),
		);
	}

	if (options.expo) {
		plugins.push(expo());
	}

	if (options.passkey) {
		plugins.push(passkey(passkeyFor(options.passkey, env)));
	}

	// jwt, the OAuth provider and CIMD, then the guards around them, before the
	// consumer's own plugins.
	if (mcpSetup) plugins.push(...mcpSetup.plugins);

	if (options.devices) plugins.push(...devicePlugins());

	plugins.push(...(options.callbacks?.plugins ?? []));

	// Provider credentials are read from env: docs/architecture/plugins/auth.md, "Social providers".
	const socialProviders: NonNullable<BetterAuthOptions["socialProviders"]> = {};
	const google = options.socialProviders?.google;
	if (google) {
		socialProviders.google = {
			clientId: env[google.clientIdVar] as string,
			clientSecret: env[google.clientSecretVar] as string,
		};
	}
	const apple = options.socialProviders?.apple;
	if (apple) {
		socialProviders.apple = {
			clientId: env[apple.clientIdVar] as string,
			clientSecret: env[apple.clientSecretVar] as string,
			appBundleIdentifier: apple.appBundleIdentifier,
		};
	}
	const socialProvidersOption =
		Object.keys(socialProviders).length > 0 ? socialProviders : undefined;

	// Dev origins and `sameSite`: docs/architecture/plugins/auth.md, "Origins and cookies".
	const devOrigins = isDevMode(env) ? (options.devTrustedOrigins ?? []) : [];
	const trustedOrigins = trustedOriginsOf(options, env);
	const sameSite = devOrigins.length > 0 ? "none" : options.sameSite;

	const instance = betterAuth({
		baseURL: appUrlOf(env, options.appUrlVar),
		secret: env[options.secretVar] as string,
		trustedOrigins,
		socialProviders: socialProvidersOption,
		// biome-ignore lint/suspicious/noExplicitAny: drizzleAdapter DB type is opaque.
		database: drizzleAdapter(db as any, {
			provider: "sqlite",
			// The Drizzle adapter's schema map: docs/architecture/plugins/auth.md, "Schema tables".
			schema: Object.assign(
				{},
				(db as { _?: { fullSchema?: Record<string, unknown> } })._?.fullSchema,
				...tableSetsOf(options).map((set) => set.tables),
			),
		}),
		advanced: {
			cookiePrefix: options.cookies?.prefix,
			crossSubDomainCookies: options.cookies?.domain
				? { enabled: true, domain: options.cookies.domain }
				: undefined,
			defaultCookieAttributes: sameSite
				? {
						sameSite,
						secure: sameSite === "none",
					}
				: undefined,
			// Without it session.ipAddress is wrong behind the CF edge.
			ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
		},
		session: {
			expiresIn: options.session?.expiresIn,
			updateAge: options.session?.updateAge,
			freshAge: options.session?.freshAge,
			// Signed session cache: docs/architecture/plugins/auth.md, "Worker runtime".
			cookieCache: options.expo
				? { enabled: false }
				: { enabled: true, maxAge: 300 },
		},
		user: options.user
			? {
					deleteUser: options.user.deleteUser
						? {
								enabled: true,
								beforeDelete: async (user, request) => {
									await options.callbacks?.beforeDelete?.({
										// Better Auth's user row carries the fields `AuthUser` names.
										user: user as AuthUser,
										request,
										env,
									});
								},
								// Conditional spread, same reason as generateOTP: an
								// undefined-valued key would make better-auth treat the
								// email-verification path as configured.
								...(options.callbacks?.sendDeleteVerification
									? {
											sendDeleteAccountVerification: async (data: {
												user: unknown;
												url: string;
												token: string;
											}) => {
												await options.callbacks?.sendDeleteVerification?.({
													user: data.user as AuthUser,
													url: data.url,
													token: data.token,
													env,
												});
											},
										}
									: {}),
							}
						: undefined,
				}
			: undefined,
		// Session deletions are announced; the sign-up policy runs first: docs/architecture/plugins/auth.md, "Session end".
		databaseHooks: {
			...(policy ? { user: { create: { before: policy.beforeCreate } } } : {}),
			session: {
				delete: {
					after: async (row) => publishSessionEnded(row),
				},
			},
		},
		plugins,
		...(options.mcp || options.devices
			? {
					disabledPaths: [
						...(options.mcp ? MCP_DISABLED_PATHS : []),
						...(options.devices ? DEVICE_DISABLED_PATHS : []),
					],
				}
			: {}),
	});
	// The instance's inferred type holds `$context` as Better Auth's full
	// context; the hooks need only its adapter.
	authContext = instance.$context as unknown as Promise<{
		adapter: GrantAdapter;
	}>;
	return instance;
}

// The scope descriptors a consumer's `src/shared/scopes.ts` exports, read off
// the module namespace codegen hands over. A descriptor exported under two
// names is one scope.
function consumerScopes(module: Record<string, unknown> | undefined): Scope[] {
	const scopes = [...new Set(Object.values(module ?? {}))].filter(
		(value): value is Scope =>
			typeof value === "object" &&
			value !== null &&
			"name" in value &&
			"table" in value &&
			"parent" in value,
	);
	const names = new Set<string>();
	for (const scope of scopes) {
		if (names.has(scope.name)) {
			throw new Error(
				`auth: two scopes are named "${scope.name}"; scope names are unique.`,
			);
		}
		names.add(scope.name);
	}
	return scopes;
}

// The membership predicate the same module exports, at most one.
function consumerMembership(
	module: Record<string, unknown> | undefined,
): Membership | null {
	const declared = Object.entries(module ?? {}).filter(
		(entry): entry is [string, Membership] =>
			typeof entry[1] === "object" &&
			entry[1] !== null &&
			"kind" in entry[1] &&
			entry[1].kind === "membership",
	);
	// A predicate exported under two names is one predicate.
	const distinct = [...new Set(declared.map(([, membership]) => membership))];
	if (distinct.length > 1) {
		// One export name for each distinct predicate.
		const names = distinct
			.map((membership) => {
				const [name] = declared.find(([, found]) => found === membership) ?? [];
				return `"${name}"`;
			})
			.join(", ");
		throw new Error(
			`auth: the scopes module exports ${distinct.length} memberships (${names}); export one defineMembership.`,
		);
	}
	return distinct[0] ?? null;
}

// The scopes a module exports that have a lookup: those whose `slug` is a
// column, keyed by name, plus the organization root.
type ScopeLookups<TOptions> = {
	organization: ScopeLookup<typeof organizationScope>;
} & (TOptions extends { scopes: infer M }
	? {
			[K in keyof M as M[K] extends Scope<infer N, unknown, SQLiteColumn>
				? N
				: never]: M[K] extends Scope ? ScopeLookup<M[K]> : never;
		}
	: Record<never, never>);

// What a route set adds only while its option is on: organizations (`organization`
// truthy), email OTP (on unless `emailOtp: false`, as the runtime builds it)
// and magic links (`magicLink: true`).
type WithOrganization<TOptions, T> = TOptions extends { organization: infer O }
	? O extends undefined | false
		? Record<never, never>
		: T
	: Record<never, never>;
type WithEmailOtp<TOptions, T> = TOptions extends { emailOtp: false }
	? Record<never, never>
	: T;
type WithMagicLink<TOptions, T> = TOptions extends { magicLink: true }
	? T
	: Record<never, never>;

// With `mcp`, a call made inside an authorization takes the page's signed
// query and may answer the redirect that resumes it: these procedures replace
// their plain forms, and `auth.oauth` joins.
type WithMcp<TOptions, T> = TOptions extends { mcp: true }
	? T
	: Record<never, never>;
type IfMcp<TOptions, Mcp, Plain> = TOptions extends { mcp: true } ? Mcp : Plain;
type Swap<Base, Over> = Omit<Base, keyof Over> & Over;

type SignInRoutes<TOptions> = WithEmailOtp<
	TOptions,
	{
		signIn: IfMcp<
			TOptions,
			ReturnType<typeof emailOtpOauthProcedures>,
			ReturnType<typeof emailOtpProcedures>
		>;
	}
> &
	WithMagicLink<
		TOptions,
		{
			signIn: IfMcp<
				TOptions,
				ReturnType<typeof magicLinkOauthProcedures>,
				ReturnType<typeof magicLinkProcedures>
			>;
		}
	>;

type OrganizationProcedures<TOptions> = IfMcp<
	TOptions,
	{
		organization: Swap<
			ReturnType<typeof organizationProcedures>["organization"],
			{ setActive: ReturnType<typeof setActiveOauthProcedure> }
		>;
	},
	ReturnType<typeof organizationProcedures>
>;

type OrganizationRoutes<TOptions> = WithOrganization<
	TOptions,
	OrganizationProcedures<TOptions> & {
		orgRules: ReturnType<typeof orgRulesProcedure>;
		scope: {
			[N in keyof ScopeLookups<TOptions>]: {
				bySlug: ScopeLookups<TOptions>[N];
			};
		};
	}
>;

type DeviceRoutes<TOptions> = TOptions extends { devices: true }
	? ReturnType<typeof deviceProcedures>
	: Record<never, never>;

type OAuthRoutes<TOptions> = WithMcp<
	TOptions,
	ReturnType<typeof oauthProcedures>
>;

type AuthRoutes<TOptions> = {
	auth: ReturnType<typeof sessionProcedures> &
		SignInRoutes<TOptions> &
		OrganizationRoutes<TOptions> &
		OAuthRoutes<TOptions> &
		DeviceRoutes<TOptions>;
};

export default function authRuntime<TOptions extends AuthRuntimeInput>(
	options: TOptions,
): RuntimePlugin<
	"auth",
	object,
	{
		auth: AuthInstance<TOptions>;
		_rateLimiter?: AuthRateLimiter;
	} & TenancyContext<TOptions> &
		OAuthContext<TOptions>,
	AuthRoutes<TOptions>
> {
	const roles = organizationRoles(options);
	// One instance per `env` of this runtime: Workers hand the same `env`
	// object to every request of an isolate, so a `WeakMap` on it builds
	// Better Auth once per isolate, with this runtime's options.
	const instances = new WeakMap<object, ReturnType<typeof buildAuth>>();
	const scopes = consumerScopes(options.scopes);
	const membership = consumerMembership(options.scopes);

	return {
		name: "auth",
		// `context()` reads `upstream.db`: docs/architecture/plugins/auth.md, "Worker runtime".
		dependsOn: ["db"],
		// Framework-owned procedures: docs/architecture/plugins/auth.md, "Procedures".
		routes(procedure: unknown) {
			// The worker passes the `api` plugin's `createProcedure<TContext>()` result;
			// `RuntimePlugin` types the argument `unknown`. Its context carries
			// the `tenancy` and the `api` endpoints of the plugins this plugin's
			// context() provides when their options are on, and each group below
			// reads only what its option provides.
			const factory = procedure as AuthProcedureFactory;

			const emailOtp = options.mcp
				? emailOtpOauthProcedures
				: emailOtpProcedures;
			const magicLink = options.mcp
				? magicLinkOauthProcedures
				: magicLinkProcedures;
			const signIn = {
				...(options.emailOtp === false ? {} : emailOtp(factory)),
				...(options.magicLink ? magicLink(factory) : {}),
			};
			// The conditional types `SignInRoutes<TOptions>` and
			// `OrganizationRoutes<TOptions>` cannot be resolved inside the generic
			// body; each fragment is built from the options that select it.
			const signInRoutes = (
				Object.keys(signIn).length > 0 ? { signIn } : {}
			) as SignInRoutes<TOptions>;
			const organizationRoutes = (
				options.organization
					? {
							// With `mcp`, `setActive` is the one that takes the authorization's
							// signed query.
							...(options.mcp
								? {
										organization: {
											...organizationProcedures(factory).organization,
											setActive: setActiveOauthProcedure(factory),
										},
									}
								: organizationProcedures(factory)),
							[ORG_RULES_PATH[1]]: orgRulesProcedure(factory, roles),
							[SCOPE_ROUTES_PATH[1]]: Object.fromEntries(
								[organizationScope, ...scopes]
									.filter((scope) => scope.slug !== null)
									.map((scope) => [
										scope.name,
										{ bySlug: bySlugProcedure(factory, scope) },
									]),
							),
						}
					: {}
			) as OrganizationRoutes<TOptions>;

			const oauthRoutes = (
				options.mcp ? oauthProcedures(factory) : {}
			) as OAuthRoutes<TOptions>;

			const deviceRoutes = (
				options.devices ? deviceProcedures(factory) : {}
			) as DeviceRoutes<TOptions>;

			return {
				[ORG_RULES_PATH[0]]: {
					...sessionProcedures(factory),
					...signInRoutes,
					...organizationRoutes,
					...oauthRoutes,
					...deviceRoutes,
				},
			};
		},
		context(env, upstream) {
			// `RuntimePlugin` types `env` and `upstream` as `unknown`; `dependsOn`
			// makes `upstream.db` the drizzle client, and `env` is the worker's bindings.
			const u = upstream as { db: unknown };
			const e = env as Record<string, unknown>;

			const rateLimiter: AuthRateLimiter = {};
			// A rate-limiter binding is a Wrangler binding `Env` does not type.
			const agentBinding = options.rateLimiter?.agent?.binding;
			const agentLimiter =
				agentBinding && !isDevMode(e)
					? (e[agentBinding] as RateLimitBinding | undefined)
					: undefined;
			const ipBinding = options.rateLimiter?.ip.binding;
			if (ipBinding && e[ipBinding]) {
				rateLimiter.ip = e[ipBinding] as RateLimitBinding;
			}
			const emailBinding = options.rateLimiter?.email.binding;
			if (emailBinding && e[emailBinding]) {
				rateLimiter.email = e[emailBinding] as RateLimitBinding;
			}

			let auth = instances.get(e);
			if (!auth) {
				auth = buildAuth(e, u.db, options);
				instances.set(e, auth);
			}
			return {
				// `buildAuth` returns whatever better-auth infers from the
				// literal built inside `buildAuth`; it structurally satisfies
				// `AuthApi` at runtime. This cast is the one place the
				// hand-declared `AuthInstance<TOptions>` contract stands in for
				// better-auth's own (differently-parameterized) inferred type; the
				// cast in `createOAuth`'s `auth` below is the same.
				auth: auth as unknown as AuthInstance<TOptions>,
				...(options.organization
					? { tenancy: createTenancy(u.db, roles, membership) }
					: {}),
				...(options.mcp
					? {
							oauth: createOAuth({
								auth: auth as unknown as Parameters<
									typeof createOAuth
								>[0]["auth"],
								db: u.db,
								roles,
								membership,
								appUrl: appUrlOf(e, options.appUrlVar),
								limiter: agentLimiter,
							}),
						}
					: {}),
				...(rateLimiter.ip || rateLimiter.email
					? { _rateLimiter: rateLimiter }
					: {}),
				_trustedOrigins: [
					...trustedOriginsOf(options, e),
					...appOrigin(appUrlOf(e, options.appUrlVar)),
				],
			} as {
				auth: AuthInstance<TOptions>;
				_rateLimiter?: AuthRateLimiter;
				_trustedOrigins?: readonly string[];
			} & TenancyContext<TOptions> &
				OAuthContext<TOptions>;
		},
		async fetch(request, _env, upstream) {
			const url = new URL(request.url);
			// With `mcp`, the discovery documents are Better Auth's too, behind
			// the same limiter.
			const served =
				url.pathname === AUTH_PREFIX ||
				url.pathname.startsWith(`${AUTH_PREFIX}/`) ||
				(options.mcp &&
					OAUTH_DISCOVERY_PREFIXES.some(
						(prefix) =>
							url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
					));
			if (!served) return null;
			const u = upstream as {
				auth: AuthInstance<TOptions>;
				_rateLimiter?: AuthRateLimiter;
				_devMode?: boolean;
			};
			if (!u._devMode) {
				const denied = await checkRateLimit(request, url, u._rateLimiter);
				if (denied) return denied;
			}
			return u.auth.handler(request);
		},
	};
}
