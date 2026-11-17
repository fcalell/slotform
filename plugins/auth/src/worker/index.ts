import { expo } from "@better-auth/expo";
import { passkey } from "@better-auth/passkey";
import { createMongoAbility } from "@casl/ability";
import type { RuntimePlugin } from "@fcalell/cli/runtime";
import {
	noSuch,
	ORG_RULES_PATH,
	SCOPE_ROUTES_PATH,
} from "@fcalell/plugin-api/procedure";
import type { Procedure } from "@fcalell/plugin-api/types";
import { getTableName, type SQLiteColumn } from "@fcalell/plugin-db/orm";
import type { BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import {
	role as buildAcRole,
	createAccessControl as createBetterAuthAccessControl,
} from "better-auth/plugins/access";
import { emailOTP } from "better-auth/plugins/email-otp";
import { magicLink } from "better-auth/plugins/magic-link";
import { organization } from "better-auth/plugins/organization";
import { z } from "zod";
import {
	compileStatements,
	type PackedRuleSet,
	packAbility,
} from "../ability/index.ts";
import { defaultOrgRoles } from "../access.ts";
import type { SessionOf, SessionUser } from "../infer.ts";
import { apikey as apikeyTable } from "../schema/devices.ts";
import { account, session, user, verification } from "../schema/index.ts";
import {
	invitation,
	member,
	organization as organizationTable,
} from "../schema/organization.ts";
import { passkey as passkeyTable } from "../schema/passkey.ts";
import {
	type Membership,
	organization as organizationScope,
	type Scope,
	type ScopeContext,
} from "../scope.ts";
import type {
	AuthCallbackPayloads,
	AuthUser,
	OtpType,
	ResolvedSocialProvider,
	SocialProviderName,
} from "../types.ts";
import { AUTH_PREFIX, OAUTH_DISCOVERY_PREFIXES } from "../types.ts";
import { devicePlugins } from "./devices.ts";
import { emailKey } from "./email-key.ts";
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
	tooManyRequests,
} from "./oauth.ts";
import {
	type AuthProcedureFactory,
	deviceProcedures,
	emailOtpOauthProcedures,
	emailOtpProcedures,
	magicLinkOauthProcedures,
	magicLinkProcedures,
	OTP_LENGTH,
	oauthProcedures,
	organizationProcedures,
	sessionProcedures,
	setActiveOauthProcedure,
} from "./procedures.ts";
import { publishSessionEnded } from "./session-ended.ts";
import { createTenancy, resolveGrants, type Tenancy } from "./tenancy.ts";

// The sign-up refusal code and sentence: docs/architecture/plugins/auth.md, "Sign-up policy".
const SIGN_UP_CLOSED = "SIGN_UP_CLOSED";
const SIGN_UP_CLOSED_MESSAGE =
	"Sign-up is closed. Ask for an invitation to join.";

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
export type { BakedPasskey } from "./listener.ts";
export type { OAuth, VerifiedAgent } from "./oauth.ts";
// The `auth.*` procedures' types name these, so a declaration emit of the
// consumer's generated `.stack/worker.ts` names them through this subpath.
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
// The request context carries a `Tenancy`, so a declaration emit of the
// consumer's generated `.stack/procedure.ts` names it through this subpath.
export type { Tenancy } from "./tenancy.ts";

// Structural match with plugin-api's `RateLimitBinding`: docs/architecture/plugins/auth.md, "Rate limiting".
export interface RateLimitBinding {
	limit(opts: { key: string }): Promise<{ success: boolean }>;
}

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
	// Dev-server origins, applied only when the worker runs with STACK_DEV.
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

// The tenancy capability exists only with organizations on, so a `scope`
// procedure type-checks only against a config that can resolve it.
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

// Per-env cache: Workers hand the same `env` object reference across
// requests within a worker instance, so a WeakMap keyed on it lets us
// initialize better-auth exactly once per isolate. Typed off `buildAuth`'s
// own inferred return (whatever better-auth infers from the literal built
// below) — internal plumbing never needs the honest `AuthInstance<TOptions>`
// contract above; only the value handed into `context()` does (see the cast
// there).
const cache = new WeakMap<object, ReturnType<typeof buildAuth>>();

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
// the baked list, plus the dev-server origins under STACK_DEV. The instance
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

// Code and field error of a reserved organization slug: docs/architecture/plugins/auth.md, "Reserved slugs".
const ORGANIZATION_SLUG_RESERVED = "ORGANIZATION_SLUG_RESERVED";

function refuseReservedSlug(
	reserved: ReadonlySet<string>,
	slug: unknown,
): void {
	if (typeof slug !== "string" || !reserved.has(slug)) return;
	const message = `The address /${slug} is reserved. Choose another.`;
	throw new APIError("BAD_REQUEST", {
		code: ORGANIZATION_SLUG_RESERVED,
		message,
		fieldErrors: { slug: message },
	});
}

// better-auth's `/organization/check-slug` answers only whether an
// organization holds the slug, so a reserved one would read as free until
// the create refused it: this refuses it there first, with the same answer.
function reservedSlugCheck(reserved: ReadonlySet<string>): BetterAuthPlugin {
	return {
		id: "reserved-slugs",
		hooks: {
			before: [
				{
					matcher: (ctx) => ctx.path === "/organization/check-slug",
					handler: createAuthMiddleware(async (ctx) =>
						refuseReservedSlug(reserved, ctx.body?.slug),
					),
				},
			],
		},
	};
}

// The adapter calls the sign-up policy reads.
interface PolicyAdapter {
	count(args: { model: string }): Promise<number>;
	findMany<T>(args: {
		model: string;
		where: { field: string; value: unknown }[];
	}): Promise<T[]>;
}

// Whether `email` may create an account under `mode`. An invitation is open
// while pending and unexpired; `first` also lets the app's first account in.
async function maySignUp(
	adapter: PolicyAdapter,
	mode: "invite" | "first",
	email: string,
): Promise<boolean> {
	if (mode === "first" && (await adapter.count({ model: "user" })) === 0) {
		return true;
	}
	const invitations = await adapter.findMany<{ expiresAt: Date | number }>({
		model: "invitation",
		where: [
			{ field: "email", value: email.toLowerCase() },
			{ field: "status", value: "pending" },
		],
	});
	return invitations.some((i) => new Date(i.expiresAt).getTime() > Date.now());
}

function signUpClosed(): APIError {
	return new APIError("FORBIDDEN", {
		code: SIGN_UP_CLOSED,
		message: SIGN_UP_CLOSED_MESSAGE,
	});
}

// A closed sign-up, refused where the account is made (every method, OAuth
// and the code or link verification included) and where a code or link would
// be sent to an address that could not use it. An existing account passes.
// Passkey registration needs a session, so it makes no account.
function signUpPolicy(
	mode: "invite" | "first",
	adapterOf: () => Promise<PolicyAdapter>,
): {
	plugin: BetterAuthPlugin;
	beforeCreate: (user: { email: string }) => Promise<void>;
} {
	const refuse = async (email: unknown): Promise<void> => {
		if (typeof email !== "string") return;
		const adapter = await adapterOf();
		const existing = await adapter.findMany<{ id: string }>({
			model: "user",
			where: [{ field: "email", value: email.toLowerCase() }],
		});
		if (existing.length > 0) return;
		if (!(await maySignUp(adapter, mode, email))) throw signUpClosed();
	};
	return {
		beforeCreate: async (user) => {
			const adapter = await adapterOf();
			if (!(await maySignUp(adapter, mode, user.email))) throw signUpClosed();
		},
		plugin: {
			id: "sign-up-policy",
			hooks: {
				before: [
					{
						matcher: (ctx) =>
							(ctx.path === "/email-otp/send-verification-otp" &&
								ctx.body?.type === "sign-in") ||
							ctx.path === "/sign-in/magic-link",
						handler: createAuthMiddleware(async (ctx) =>
							refuse(ctx.body?.email),
						),
					},
				],
			},
		},
	};
}

class MissingSendOtpError extends Error {
	constructor() {
		super(
			"plugin-auth: `emailOtp` is on but the callbacks file defines no `sendOTP`. " +
				"Implement `sendOTP` in src/worker/plugins/auth.ts, or set `emailOtp: false`.",
		);
		this.name = "MissingSendOtpError";
	}
}

class MissingSendMagicLinkError extends Error {
	constructor() {
		super(
			"plugin-auth: `magicLink` is on but the callbacks file defines no `sendMagicLink`. " +
				"Implement `sendMagicLink` in src/worker/plugins/auth.ts, or set `magicLink: false`.",
		);
		this.name = "MissingSendMagicLinkError";
	}
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
	const plugins: BetterAuthPlugin[] = [];
	if (options.mcp && !options.organization) {
		throw new Error(
			"plugin-auth: `mcp` needs `organization`: a grant is to one organization.",
		);
	}
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
					if (!authContext) throw new Error("plugin-auth: auth is not built");
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
	if (policy) {
		if (!options.organization) {
			throw new Error(
				`plugin-auth: \`signUp: "${options.signUp}"\` needs \`organization\`: the invitations are its.`,
			);
		}
		plugins.push(policy.plugin);
	}

	if (options.emailOtp !== false) {
		const sendOTP = options.callbacks?.sendOTP;
		if (!sendOTP) throw new MissingSendOtpError();
		// The fixture member's code under `stack screens serve` (which sets
		// `STACK_DEV`): the one address's code is fixed, every other's is its own.
		const serveCode =
			isDevMode(env) && typeof env.STACK_SERVE_CODE === "string"
				? env.STACK_SERVE_CODE
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
								email === env.STACK_SERVE_EMAIL
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
		if (!sendMagicLink) throw new MissingSendMagicLinkError();
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
					await options.callbacks?.sendInvitation?.({
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

	// Native client support: Better Auth's server-side expo() plugin is
	// required for the @better-auth/expo client (deep-link redirect, cookie
	// handling, native origin trust). Contributes no database tables.
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
			schema: {
				...(db as { _?: { fullSchema?: Record<string, unknown> } })._
					?.fullSchema,
				user,
				session,
				account,
				verification,
				...(options.organization
					? { organization: organizationTable, member, invitation }
					: {}),
				...(options.passkey ? { passkey: passkeyTable } : {}),
				...(options.devices ? { apikey: apikeyTable } : {}),
			},
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
			// Cloudflare sets the canonical client IP here; without it
			// session.ipAddress is wrong behind the CF edge.
			ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
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

function getOrInitAuth(
	env: Record<string, unknown>,
	db: unknown,
	options: AuthRuntimeInput,
): ReturnType<typeof buildAuth> {
	let auth = cache.get(env);
	if (!auth) {
		auth = buildAuth(env, db, options);
		cache.set(env, auth);
	}
	return auth;
}

// The sends are the email-bombing amplifiers — the only auth routes that get
// a per-email limit on top of the blanket per-IP one. Both share the email's
// bucket. The magic-link verify is a GET with no body: per-IP only.
const EMAIL_SEND_SUFFIXES = [
	"/email-otp/send-verification-otp",
	"/sign-in/magic-link",
];

// Reads `email` off a cloned request body — the original must still reach
// Better Auth unconsumed. A body that fails to parse, or carries no
// non-empty string `email`, isn't an error here: the per-email check is
// simply skipped (the per-IP limit still applies).
async function readRequestEmail(request: Request): Promise<string | null> {
	try {
		const body: unknown = await request.clone().json();
		if (body && typeof body === "object" && "email" in body) {
			const email = body.email;
			if (typeof email === "string" && email.length > 0) return email;
		}
	} catch {
		// not JSON / no body — skip the per-email check
	}
	return null;
}

async function checkRateLimit(
	request: Request,
	url: URL,
	rateLimiter: { ip?: RateLimitBinding; email?: RateLimitBinding } | undefined,
): Promise<Response | null> {
	if (!rateLimiter) return null;

	if (rateLimiter.ip) {
		// Cloudflare-set and unspoofable — deliberately not X-Forwarded-For.
		const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
		const result = await rateLimiter.ip.limit({ key: ip });
		if (!result.success) return tooManyRequests();
	}

	if (
		rateLimiter.email &&
		EMAIL_SEND_SUFFIXES.some((suffix) => url.pathname.endsWith(suffix))
	) {
		const email = await readRequestEmail(request);
		if (email) {
			const result = await rateLimiter.email.limit({ key: emailKey(email) });
			if (!result.success) return tooManyRequests();
		}
	}

	return null;
}

// ---------- auth.orgRules and auth.scope.<name>.bySlug ----------
//
// `routes(procedure)` takes the factory as `unknown`: docs/architecture/plugins/auth.md, "Worker runtime".

// A slug names the organization on its own; below it, a slug is unique only
// within its parent, whose id comes along.
const ORGANIZATION_LOOKUP = z.object({ slug: z.string().min(1) });
const SCOPE_LOOKUP = z.object({
	slug: z.string().min(1),
	parentId: z.string().min(1),
});

// The entities a scope's lookup reads: each table of its chain by its SQL
// name, which is its entity when the schema exports the table under that
// name, and the membership the organization tier resolves.
function scopeReads(scope: Scope): string[] {
	const reads = ["member"];
	for (let level: Scope | undefined = scope; level; level = level.parent?.[0]) {
		reads.push(getTableName(level.table));
	}
	return reads.sort();
}

// The scope descriptors a consumer's `src/shared/scopes.ts` exports, read off
// the module namespace codegen hands over.
function consumerScopes(module: Record<string, unknown> | undefined): Scope[] {
	const scopes = Object.values(module ?? {}).filter(
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
				`plugin-auth: two scopes are named "${scope.name}"; scope names are unique.`,
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
	if (declared.length > 1) {
		const names = declared.map(([name]) => `"${name}"`).join(", ");
		throw new Error(
			`plugin-auth: the scopes module exports ${declared.length} memberships (${names}); export one defineMembership.`,
		);
	}
	return declared[0]?.[1] ?? null;
}

// `orgRules` reads `member`: docs/architecture/plugins/query.md, "Abilities".
function orgRulesProcedure(
	factory: AuthProcedureFactory,
	roles: Record<string, unknown>,
) {
	return factory({
		auth: true,
		scope: organizationScope,
		reads: ["member"],
	}).query(async ({ context }): Promise<{ rules: PackedRuleSet }> => {
		const grants = resolveGrants(context.member.role, roles);
		const ability = createMongoAbility(compileStatements(grants));
		return { rules: packAbility(ability) };
	});
}

// A scope lookup is invalidated by writes on its chain: docs/architecture/plugins/auth.md, "Scopes".
function bySlugProcedure<S extends Scope>(
	factory: AuthProcedureFactory,
	scope: S,
): ScopeLookup<S> {
	return factory({ auth: true, reads: scopeReads(scope) })
		.input(scope.parent ? SCOPE_LOOKUP : ORGANIZATION_LOOKUP)
		.query(async ({ input, context }) => {
			const found = await context.tenancy.bySlug(
				scope,
				input.slug,
				"parentId" in input && typeof input.parentId === "string"
					? input.parentId
					: undefined,
				context.user.id,
			);
			if (!found) {
				throw noSuch(scope);
			}
			return found;
		});
}

// A scope's lookup: the slug within its parent, answered by the chain's rows
// and the caller's `member`.
type ScopeLookup<S extends Scope> = Procedure<
	{ slug: string } | { slug: string; parentId: string },
	ScopeContext<S>
>;

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
		_rateLimiter?: { ip?: RateLimitBinding; email?: RateLimitBinding };
	} & TenancyContext<TOptions> &
		OAuthContext<TOptions>,
	AuthRoutes<TOptions>
> {
	const roles = organizationRoles(options);
	const scopes = consumerScopes(options.scopes);
	const membership = consumerMembership(options.scopes);

	return {
		name: "auth",
		// `context()` reads `upstream.db`: docs/architecture/plugins/auth.md, "Worker runtime".
		dependsOn: ["db"],
		// Framework-owned procedures: docs/architecture/plugins/auth.md, "Procedures".
		routes(procedure: unknown) {
			// The worker passes plugin-api's `createProcedure<TContext>()` result;
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

			const rateLimiter: { ip?: RateLimitBinding; email?: RateLimitBinding } =
				{};
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

			const auth = getOrInitAuth(e, u.db, options);
			return {
				// `getOrInitAuth` returns whatever better-auth infers from the
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
				_rateLimiter?: { ip?: RateLimitBinding; email?: RateLimitBinding };
				_trustedOrigins?: readonly string[];
			} & TenancyContext<TOptions> &
				OAuthContext<TOptions>;
		},
		async fetch(request, _env, upstream) {
			const url = new URL(request.url);
			// With `mcp`, the discovery documents are Better Auth's too, behind
			// the same limiter.
			const served =
				url.pathname.startsWith(AUTH_PREFIX) ||
				(options.mcp &&
					OAUTH_DISCOVERY_PREFIXES.some(
						(prefix) =>
							url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
					));
			if (!served) return null;
			const u = upstream as {
				auth: AuthInstance<TOptions>;
				_rateLimiter?: { ip?: RateLimitBinding; email?: RateLimitBinding };
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
