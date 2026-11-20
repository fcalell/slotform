import type { PluginRuntimeEntry } from "@slotform/api";
import { api } from "@slotform/api";
import { RESERVED_SLUGS } from "@slotform/api/lib/slugify";
import type { ContributionCtx } from "@slotform/cli";
import { callback, GENERATED_DIR, plugin, slot } from "@slotform/cli";
import type { TsExpression, TsImportSpec } from "@slotform/cli/ast";
import { literalToProps } from "@slotform/cli/ast";
import { cliSlots } from "@slotform/cli/cli-slots";
import { SlotformError } from "@slotform/cli/errors";
import { cloudflare } from "@slotform/cloudflare";
import { db } from "@slotform/db";
import { screens } from "@slotform/screens";
import { defaultOrgStatements } from "./access.ts";
import {
	pendingCallbacks,
	requiredCallbacks,
	stubbedCallbacksMessage,
} from "./callback-stubs.ts";
import type { AuthClientOptions, OrganizationAccess } from "./client.ts";
import { tableSetsOf } from "./schema/sets.ts";
import {
	AUTH_PREFIX,
	type AuthCallbackPayloads,
	authOptionsSchema,
	OAUTH_DISCOVERY_PREFIXES,
	type ResolvedAuthOptions,
	resolveSocialProviders,
} from "./types.ts";

const SOURCE = "auth";

// Canonical path of the callback file: docs/architecture/plugins/auth.md, "Callbacks".
const CALLBACK_FILE = "src/worker/plugins/auth.ts";

// The scope descriptors file: docs/architecture/plugins/auth.md, "Scopes".
const SCOPES_FILE = "src/shared/scopes.ts";
const SCOPES_IDENTIFIER = "scopes";

// The statements of the consumer's `ac`. `ac` and `roles` are `unknown` in the
// options schema (an `ac` is a function-bearing object no schema can hold).
function statementsOf(
	org: ResolvedAuthOptions["organization"],
): Record<string, readonly string[]> | undefined {
	if (typeof org !== "object") return undefined;
	return (
		org.ac as { statements?: Record<string, readonly string[]> } | undefined
	)?.statements;
}

// Access control as generated code holds it: docs/architecture/plugins/auth.md, "Access control".
function organizationAccess(
	org: ResolvedAuthOptions["organization"],
): OrganizationAccess | boolean {
	if (typeof org !== "object") return Boolean(org);
	const statements = statementsOf(org);
	return {
		...(statements ? { statements } : {}),
		...(org.roles
			? {
					roles: org.roles as Record<string, Record<string, readonly string[]>>,
				}
			: {}),
	};
}

async function wiresScopes(
	ctx: { fileExists(path: string): Promise<boolean> },
	options: ResolvedAuthOptions,
): Promise<boolean> {
	return Boolean(options.organization) && (await ctx.fileExists(SCOPES_FILE));
}

// ── Slot declarations ──────────────────────────────────────────────
//
// `runtimeOptions` is a derived slot: docs/architecture/plugins/auth.md, "Runtime options".

// Addresses an organization's slug may not take: docs/architecture/plugins/auth.md, "Reserved slugs".
const reservedSlugs = slot.list<string>({
	source: SOURCE,
	name: "reservedSlugs",
});

const runtimeOptions = slot.derived({
	source: SOURCE,
	name: "runtimeOptions",
	inputs: {
		cors: api.slots.cors,
		devCors: api.slots.devCorsOrigins,
		devTargets: api.slots.devTargetOrigins,
		reserved: reservedSlugs,
		nativeScheme: api.slots.nativeScheme,
	},
	compute: async (
		inp,
		ctx: ContributionCtx<ResolvedAuthOptions>,
	): Promise<Record<string, TsExpression>> => {
		// An empty origin list refuses generation: docs/architecture/plugins/auth.md, "Origins and cookies".
		if (inp.cors.length === 0) {
			throw new Error(
				"auth: cannot generate runtime — no trusted origins are available. " +
					"Better Auth requires at least one trusted origin for CSRF protection. " +
					"Fix by one of:\n" +
					"  • set `app.domain` in slotform.config.ts (derives https://<domain> + https://app.<domain>)\n" +
					"  • set `app.origins: [...]` to supply the allow-list explicitly",
			);
		}

		// Seed the runtime options with the consumer's options: docs/architecture/plugins/auth.md, "Plugin shape".
		// `ctx.options` is the plugin's typed options, spread here as a record.
		const rawOptions = { ...(ctx.options as Record<string, unknown>) };
		delete rawOptions.callbacks;
		// Only binding names are baked: docs/architecture/plugins/auth.md, "Rate limiting".
		rawOptions.rateLimiter = {
			ip: { binding: ctx.options.rateLimiter.ip.binding },
			email: { binding: ctx.options.rateLimiter.email.binding },
			...(ctx.options.mcp
				? { agent: { binding: ctx.options.rateLimiter.agent.binding } }
				: {}),
		};
		// Baked only when on, so the runtime's context types the `oauth`
		// capability from the literal.
		if (!ctx.options.mcp) delete rawOptions.mcp;
		// Bake provider env-var references, never the raw input: docs/architecture/plugins/auth.md, "Social providers".
		const resolvedProviders = resolveSocialProviders(
			ctx.options.socialProviders,
		);
		if (Object.keys(resolvedProviders).length > 0) {
			rawOptions.socialProviders = resolvedProviders;
		} else {
			delete rawOptions.socialProviders;
		}
		// Baked only when on, as `mcp` is.
		if (!ctx.options.devices) delete rawOptions.devices;
		const expoEnabled = Boolean(ctx.options.expo);
		// The runtime reads a flag; the scheme is baked into `trustedOrigins`.
		if (expoEnabled) rawOptions.expo = true;
		else delete rawOptions.expo;
		const scheme =
			typeof ctx.options.expo === "object"
				? ctx.options.expo.scheme
				: inp.nativeScheme;

		// Passkey defaults are baked: docs/architecture/plugins/auth.md, "Passkeys".
		const devOrigins = [...inp.devCors, ...inp.devTargets];
		const passkey = ctx.options.passkey;
		if (passkey) {
			rawOptions.passkey = {
				rpID: passkey.rpID ?? ctx.app.domain,
				rpName: passkey.rpName ?? ctx.app.name,
				origin: passkey.origin ?? inp.cors,
				...(devOrigins.length > 0 ? { devOrigin: devOrigins } : {}),
				...(passkey.authenticatorSelection
					? { authenticatorSelection: passkey.authenticatorSelection }
					: {}),
			};
		} else {
			delete rawOptions.passkey;
		}

		if (typeof ctx.options.organization === "object") {
			rawOptions.organization = organizationAccess(ctx.options.organization);
		}
		// The slugs the runtime refuses on organization create and update.
		if (ctx.options.organization) {
			rawOptions.reservedSlugs = [
				...new Set([...RESERVED_SLUGS, ...inp.reserved]),
			].sort();
		}

		const props = literalToProps(rawOptions);

		// `trustedOrigins`: docs/architecture/plugins/auth.md, "Origins and cookies".
		const trustedOrigins = [...inp.cors];
		if (expoEnabled) {
			if (scheme === null) {
				throw new Error(
					"auth: `expo: true` trusts the native app's deep-link scheme, and no plugin contributes one. Add `expo()` to slotform.config.ts, or name the phone's scheme: `expo: { scheme }`.",
				);
			}
			trustedOrigins.push(`${scheme}://`, `${scheme}://*`);
		}
		props.trustedOrigins = {
			kind: "array",
			items: trustedOrigins.map((o) => ({ kind: "string", value: o })),
		};

		// Dev-server origins: docs/architecture/plugins/auth.md, "Origins and cookies".
		if (devOrigins.length > 0) {
			props.devTrustedOrigins = {
				kind: "array",
				items: devOrigins.map((o) => ({ kind: "string", value: o })),
			};
		}

		// `sameSite` for native and dev: docs/architecture/plugins/auth.md, "Origins and cookies".
		if (expoEnabled) {
			props.sameSite = { kind: "string", value: "none" };
		}

		// Paired with the namespace import contributed to
		// `api.slots.workerImports` below.
		if (await wiresScopes(ctx, ctx.options)) {
			props.scopes = { kind: "identifier", name: SCOPES_IDENTIFIER };
		}

		return props;
	},
});

// `APP_URL`'s devDefault: docs/architecture/plugins/auth.md, "APP_URL default".
const appUrlDevDefault = slot.derived({
	source: SOURCE,
	name: "appUrlDevDefault",
	inputs: {
		devCors: api.slots.devCorsOrigins,
		devTargets: api.slots.devTargetOrigins,
	},
	compute: (inp, ctx): string =>
		inp.devCors[0] ?? inp.devTargets[0] ?? `https://${ctx.app.domain}`,
});

// The callback file location: docs/architecture/plugins/auth.md, "Callbacks".
const callbackFile = slot.value<string>({
	source: SOURCE,
	name: "callbackFile",
	seed: () => CALLBACK_FILE,
});

// The resolved session-cookie prefix: docs/architecture/plugins/auth.md, "Cookie prefix".
const cookiePrefix = slot.value<string, ResolvedAuthOptions>({
	source: SOURCE,
	name: "cookiePrefix",
	seed: (ctx) => ctx.options.cookies?.prefix ?? "better-auth",
});

// The web client's flags: docs/architecture/plugins/auth.md, "Web client".
export type AuthClientFlags = Required<Omit<AuthClientOptions, "baseURL">>;

const clientFlags = slot.value<AuthClientFlags | null>({
	source: SOURCE,
	name: "clientFlags",
	seed: () => null,
});

export const auth = plugin("auth", {
	label: "Auth",

	schema: authOptionsSchema,

	requires: ["api", "db"],

	// Callback payload shapes: docs/architecture/plugins/auth.md, "Callbacks".
	callbacks: {
		// Required only while `emailOtp` is on; the runtime refuses to build
		// better-auth without it then.
		sendOTP: callback.optional<AuthCallbackPayloads["sendOTP"]>(),
		// Required only while `magicLink` is on, as `sendOTP` is for `emailOtp`.
		sendMagicLink: callback.optional<AuthCallbackPayloads["sendMagicLink"]>(),
		sendInvitation: callback.optional<AuthCallbackPayloads["sendInvitation"]>(),
		beforeDelete: callback.optional<AuthCallbackPayloads["beforeDelete"]>(),
		sendDeleteVerification:
			callback.optional<AuthCallbackPayloads["sendDeleteVerification"]>(),
		// Read synchronously by better-auth, and `undefined` means "use the
		// default generator for this request", so the return type is declared
		// rather than left at the framework's awaited default.
		generateOTP: callback.optional<
			AuthCallbackPayloads["generateOTP"],
			string | undefined
		>(),
	},

	guide: [
		{
			page: "config",
			trigger:
				"Configuring auth: `auth()` options, its env vars, or the auth tables `src/schema/index.ts` re-exports",
		},
		{
			page: "callbacks",
			trigger:
				"Writing `src/worker/plugins/auth.ts`: sending codes, magic links or invitations, account deletion, or a sign-in flow of your own",
		},
		{
			page: "sign-in",
			trigger:
				"Adding OAuth, passkeys or magic links, or calling auth from the web or native client",
		},
		{
			page: "mcp-oauth",
			trigger:
				"Letting an MCP client connect (`mcp: true`), verifying its access token, or listing and revoking the clients a member connected",
		},
		{
			page: "devices",
			trigger:
				"Letting a machine with no browser (an agent daemon, a sync client) call the API, `/ws` or a service route as a member (`devices: true`)",
		},
		{
			page: "organizations",
			trigger:
				"Working with organizations, members, invitations, roles or organization slugs",
		},
		{
			page: "scopes",
			trigger:
				"Declaring a tenancy tier below the organization (`defineScope`)",
		},
		{
			page: "abilities",
			trigger:
				"Gating access by a record's own data (an owner column, a per-record role)",
		},
		{ page: "add-a-role", trigger: "Adding a role or a permission" },
		{
			page: "protect-by-scope",
			trigger:
				"Restricting a procedure to the members of an organization or a scope",
		},
	],

	slots: {
		runtimeOptions,
		appUrlDevDefault,
		callbackFile,
		cookiePrefix,
		clientFlags,
		reservedSlugs,
	},

	contributes: (self) => [
		cliSlots.initPrompts.contribute((ctx) => {
			const cookiePrefixDefault = ctx.app.name;
			return {
				plugin: "auth",
				ask: async (rawCtx) => {
					// ContributionCtx carries `prompt` in its CLI shape (the ask
					// function is invoked by command code with the real ctx). We
					// cast narrowly to read prompt without widening the public
					// PromptSpec surface.
					const c = rawCtx as {
						prompt: {
							text: (
								msg: string,
								opts?: { default?: string },
							) => Promise<string>;
							confirm: (msg: string) => Promise<boolean>;
						};
					};
					const prefix = await c.prompt.text("Cookie prefix:", {
						default: cookiePrefixDefault,
					});
					const organization = await c.prompt.confirm("Include organizations?");
					return {
						cookies: { prefix },
						organization,
					};
				},
			};
		}),

		// `nodejs_compat` flag: docs/architecture/plugins/auth.md, "Slot contributions".
		cloudflare.slots.compatibilityFlags.contribute(() => "nodejs_compat"),

		cloudflare.slots.bindings.contribute(() => [
			{
				kind: "rate_limiter" as const,
				binding: self.options.rateLimiter.ip.binding,
				simple: {
					limit: self.options.rateLimiter.ip.limit,
					period: self.options.rateLimiter.ip.period,
				},
			},
			{
				kind: "rate_limiter" as const,
				binding: self.options.rateLimiter.email.binding,
				simple: {
					limit: self.options.rateLimiter.email.limit,
					period: self.options.rateLimiter.email.period,
				},
			},
			// One bucket per agent grant, bound only while agents connect.
			...(self.options.mcp
				? [
						{
							kind: "rate_limiter" as const,
							binding: self.options.rateLimiter.agent.binding,
							simple: {
								limit: self.options.rateLimiter.agent.limit,
								period: self.options.rateLimiter.agent.period,
							},
						},
					]
				: []),
		]),

		api.slots.env.contribute(async (ctx) => {
			const devAppUrl = await ctx.resolve(self.slots.appUrlDevDefault);
			// One client-id + client-secret entry per enabled OAuth provider, so
			// the generated `.dev.vars` template prompts for real credentials.
			const providerSecrets = Object.values(
				resolveSocialProviders(self.options.socialProviders),
			)
				.filter((p): p is NonNullable<typeof p> => p !== undefined)
				.flatMap((p) => [
					{ name: p.clientIdVar, devDefault: "dev-oauth-client-id" },
					{ name: p.clientSecretVar, devDefault: "dev-oauth-client-secret" },
				]);
			return [
				{
					// Dev default satisfies its own minLength so a fresh project
					// serves out of the box; better-auth warns below 32 chars.
					name: self.options.secretVar,
					devDefault: "dev-secret-change-me-32-chars-minimum",
					validate: { minLength: 32 },
				},
				{
					name: self.options.appUrlVar,
					devDefault: devAppUrl,
					// `devLocalhost`: a non-local APP_URL while SLOTFORM_DEV is set
					// means dev settings leaked into a deploy — refuse to serve.
					validate: { url: true, devLocalhost: true },
				},
				...providerSecrets,
			];
		}),

		// Route prefixes: docs/architecture/plugins/auth.md, "Slot contributions".
		api.slots.routePrefixes.contribute(() =>
			self.options.mcp
				? [AUTH_PREFIX, ...OAUTH_DISCOVERY_PREFIXES]
				: AUTH_PREFIX,
		),

		// `slotform screens serve` env: docs/architecture/plugins/auth.md, "Screens".
		screens.slots.serveEnv.contribute(() => ({ url }) => ({
			[self.options.appUrlVar]: url,
			...(self.options.emailOtp === false
				? {}
				: {
						SLOTFORM_SERVE_EMAIL: "fixture@example.com",
						SLOTFORM_SERVE_CODE: "000000",
					}),
		})),

		// The `/fixture/link` control of the served worker, which signs in with
		// the email code above.
		screens.slots.serveControls.contribute(() =>
			self.options.emailOtp === false ? undefined : "@slotform/auth/serve",
		),

		// Workbench session handlers: docs/architecture/plugins/auth.md, "Screens".
		screens.slots.handlerModules.contribute(() => "@slotform/auth/screens"),
		screens.slots.fixtureModules.contribute(
			() => "@slotform/auth/screens-fixtures",
		),

		// The server has auth: a client app of this server reads it from the
		// manifest api writes.
		api.slots.serverAuth.contribute(() => true),

		// The MCP endpoint (api's `src/worker/mcp.ts`) authenticates through
		// this provider, and answers at `/mcp`: no organization may take it.
		api.slots.mcpAuth.contribute(() => (self.options.mcp ? true : undefined)),
		self.slots.reservedSlugs.contribute(() =>
			self.options.mcp ? "mcp" : undefined,
		),

		// The extension stays, as on the callbacks import: the node target runs
		// the generated worker as written.
		api.slots.workerImports.contribute(
			async (ctx): Promise<TsImportSpec | undefined> =>
				(await wiresScopes(ctx, self.options))
					? { source: `../${SCOPES_FILE}`, namespace: SCOPES_IDENTIFIER }
					: undefined,
		),

		self.slots.clientFlags.contribute(() => ({
			passkey: self.options.passkey !== false,
			emailOtp: self.options.emailOtp,
			magicLink: self.options.magicLink,
			organization: organizationAccess(self.options.organization),
			mcp: self.options.mcp,
		})),

		// Worker runtime entry: docs/architecture/plugins/auth.md, "Runtime options".
		api.slots.pluginRuntimes.contribute(
			async (ctx): Promise<PluginRuntimeEntry> => {
				const options = await ctx.resolve(self.slots.runtimeOptions);
				return {
					plugin: "auth",
					import: {
						source: "@slotform/auth/runtime",
						default: "authRuntime",
					},
					identifier: "authRuntime",
					options,
				};
			},
		),

		// Callback file wiring: docs/architecture/plugins/auth.md, "Callbacks".
		api.slots.callbacks.contribute(async (ctx) => {
			const path = await ctx.resolve(self.slots.callbackFile);
			const exists = await ctx.fileExists(path);
			if (!exists) {
				// With no callback required, no file is wired.
				const required = requiredCallbacks(self.options);
				if (required.length === 0) return undefined;
				const needs = required.map((name) => `\`${name}\``).join(" and ");
				throw new Error(
					`auth: callback file \`${path}\` is missing. ` +
						`The consumer implements ${needs} there. ` +
						"Run `slotform init` / `slotform add auth` to scaffold the file, " +
						"or turn the sign-in that needs it off.",
				);
			}
			// The callback file stays under `src/`: docs/architecture/plugins/auth.md, "Callbacks".
			if (!path.startsWith("src/")) {
				throw new Error(
					`auth: \`auth.slots.callbackFile\` must live under \`src/\` ` +
						`(got \`${path}\`). The generated worker imports callbacks relative ` +
						`to \`${GENERATED_DIR}/worker.ts\` and cannot reach paths outside \`src/\`.`,
				);
			}
			// The extension stays: the Node target runs the generated worker as
			// written, and ESM resolves no extensionless path.
			const importSource = `../${path}`;
			return {
				auth: {
					import: {
						source: importSource,
						default: "authCallbacks",
					},
					identifier: "authCallbacks",
				},
			};
		}),

		// Pre-deploy guard: docs/architecture/plugins/auth.md, "Callbacks".
		cliSlots.deployChecks.contribute(async (ctx) => {
			const path = await ctx.resolve(self.slots.callbackFile);
			if (!(await ctx.fileExists(path))) return undefined;
			const pending = pendingCallbacks(
				await ctx.readFile(path),
				requiredCallbacks(self.options),
			);
			if (pending.length === 0) return undefined;
			throw new SlotformError(
				stubbedCallbacksMessage(path, pending),
				"AUTH_CALLBACK_STUB",
			);
		}),

		// RBAC statements: docs/architecture/slot-catalog.md, "`api.slots.*` (the `api` plugin)".
		api.slots.rbacStatements.contribute(() => {
			const org = self.options.organization;
			if (!org) return undefined;
			return statementsOf(org) ?? defaultOrgStatements;
		}),

		// Entity vocabulary handoff: docs/architecture/plugins/db.md, "Entity vocabulary".
		api.slots.entities.contribute(() =>
			tableSetsOf(self.options).flatMap((set) => Object.keys(set.tables)),
		),

		// The scaffolded schema re-exports auth's tables, so they migrate with
		// the app's own.
		db.slots.schemaModules.contribute(() =>
			tableSetsOf(self.options).map((set) => set.module),
		),
	],
});

export type { AuthOptions } from "./types.ts";
