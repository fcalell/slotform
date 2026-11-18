import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";

// Code and field error of a reserved organization slug: docs/architecture/plugins/auth.md, "Reserved slugs".
const ORGANIZATION_SLUG_RESERVED = "ORGANIZATION_SLUG_RESERVED";

export function refuseReservedSlug(
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
export function reservedSlugCheck(
	reserved: ReadonlySet<string>,
): BetterAuthPlugin {
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
