import type { ExpoOptions } from "../types.ts";

// The app name lowercased, each run of other characters one `separator`, none
// at the ends; empty when the name holds no letter or digit.
function slugify(name: string, separator: "-" | "_"): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, separator)
		.replace(/^[-_]+|[-_]+$/g, "");
}

export function appSlug(name: string): string {
	return slugify(name, "-") || "app";
}

// The deep-link scheme the app config registers and api's `nativeScheme`
// carries to its readers: the `scheme` option, else the app name's slug.
export function deepLinkScheme(ctx: {
	options: ExpoOptions;
	app: { name: string };
}): string {
	return ctx.options.scheme ?? appSlug(ctx.app.name);
}

// The dataset name carries the app slug: dataset names are account-global, and
// two apps sharing one would mix their canaries.
export function versionGateDataset(appName: string): string {
	return `${slugify(appName, "_") || "stack_app"}_version_gate`;
}

// Make a string a legal Java/Android package segment: alphanumerics only, and,
// since a segment must start with a letter, a leading digit prefixed with `a`
// ("1foo" gives "a1foo"). Empty input falls back to "app".
function packageSegment(raw: string): string {
	const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
	if (cleaned.length === 0) return "app";
	return /^[0-9]/.test(cleaned) ? `a${cleaned}` : cleaned;
}

// Reverse a domain into a bundle-id prefix: "wenauti.app" gives "app.wenauti".
function reverseDomain(domain: string): string {
	const segments = domain
		.split(".")
		.map((s) => s.replace(/[^a-zA-Z0-9]/g, ""))
		.filter((s) => s.length > 0)
		.map(packageSegment);
	return segments.length > 0 ? segments.reverse().join(".") : "app";
}

// The bundle identifier, the reversed domain plus the app leaf; a domain whose
// last label already is the slug keeps no doubled leaf ("wenauti.app" and
// "wenauti" give "app.wenauti"), a generic one keeps it ("example.com" and
// "myapp" give "com.example.myapp").
export function buildBundleId(domain: string, slug: string): string {
	const prefix = reverseDomain(domain);
	const leaf = packageSegment(slug);
	const labels = prefix.split(".");
	if (labels[labels.length - 1] === leaf) return prefix;
	return `${prefix}.${leaf}`;
}
