import type { AuthCallbacks } from "@fcalell/plugin-auth/runtime";

// The auth callbacks: docs/architecture/plugins/auth.md, "Callbacks".
const isDev = (env: unknown) =>
	(env as { STACK_DEV?: string }).STACK_DEV === "1";

const callbacks: AuthCallbacks = {
	sendOTP({ email, code, env }) {
		// TODO: send OTP email
		if (!isDev(env))
			throw new Error(
				"sendOTP is not implemented: edit src/worker/plugins/auth.ts",
			);
		console.log(`OTP for ${email}: ${code}`);
	},
	sendInvitation({ invitationId, email, organization, env }) {
		// TODO: send invitation email linking to your accept page
		if (!isDev(env))
			throw new Error(
				"sendInvitation is not implemented: edit src/worker/plugins/auth.ts",
			);
		console.log(
			`Invitation ${invitationId} for ${email} to ${organization.name}`,
		);
	},
	// Your own better-auth plugins, registered after the framework's:
	// plugins: [myEnrolmentLink()],
};

export default callbacks;
