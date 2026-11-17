// Deploy check over the scaffold's TODO markers: docs/architecture/plugins/auth.md, "Callbacks".

export const CALLBACK_MARKERS = {
	sendOTP: "// TODO: send OTP email",
	sendInvitation: "// TODO: send invitation email linking to your accept page",
	sendMagicLink: "// TODO: send the magic link email",
} as const;

type StubbedCallback = keyof typeof CALLBACK_MARKERS;

// The callbacks the options make required, in the order a consumer meets them.
export function requiredCallbacks(options: {
	emailOtp?: boolean;
	magicLink?: boolean;
	organization?: unknown;
}): StubbedCallback[] {
	return [
		...(options.emailOtp === false ? [] : (["sendOTP"] as const)),
		...(options.magicLink ? (["sendMagicLink"] as const) : []),
		...(options.organization ? (["sendInvitation"] as const) : []),
	];
}

export function pendingCallbacks(
	source: string,
	required: readonly StubbedCallback[],
): StubbedCallback[] {
	return required.filter((name) => source.includes(CALLBACK_MARKERS[name]));
}

export function stubbedCallbacksMessage(
	path: string,
	pending: readonly StubbedCallback[],
): string {
	const names = pending.map((name) => `\`${name}\``).join(", ");
	const markers = pending
		.map((name) => `"${CALLBACK_MARKERS[name]}"`)
		.join(", ");
	return (
		`plugin-auth: \`${path}\` still holds the scaffolded stub for ${names} ` +
		`(the ${markers} marker). Implement ${pending.length > 1 ? "them" : "it"} ` +
		"to send the email, then delete the marker: the stub sends nothing and " +
		"throws outside dev, so no sign-in would complete."
	);
}
