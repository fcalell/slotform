import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";

// The sign-up refusal code and sentence: docs/architecture/plugins/auth.md, "Sign-up policy".
const SIGN_UP_CLOSED = "SIGN_UP_CLOSED";
const SIGN_UP_CLOSED_MESSAGE =
	"Sign-up is closed. Ask for an invitation to join.";

// The adapter calls the sign-up policy reads.
export interface PolicyAdapter {
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
export function signUpPolicy(
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
