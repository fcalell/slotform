import slugifyPkg from "slugify";

// Reserved slugs: docs/architecture/plugins/auth.md, "Reserved slugs".
export const RESERVED_SLUGS = [
	"admin",
	"api",
	"system",
	"auth",
	"new",
	"settings",
] as const;

const reserved = new Set<string>(RESERVED_SLUGS);

// `slugify` turns text into a URL segment and never refuses; `isReservedSlug`
// answers whether a slug is taken by the app's own routes, so a procedure
// names the refusal as its own field error. A dot is a word boundary, so a
// domain reads as its words.
export function slugify(text: string): string {
	return slugifyPkg(text.replaceAll(".", " "), {
		lower: true,
		strict: true,
		trim: true,
	});
}

export function isReservedSlug(slug: string): boolean {
	return reserved.has(slug);
}
