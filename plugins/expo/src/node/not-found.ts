import { readdirSync } from "node:fs";
import { join } from "node:path";

// expo-router reads the not-found route from the routes directory: docs/architecture/plugins/expo.md, "Routes".
const OWN = /^\+not-found\.[cm]?[jt]sx?$/;

export const NOT_FOUND_FILE = "+not-found.tsx";

// Whether the app has a route of its own for an unmatched address, which a
// generated one never replaces.
export function hasNotFoundRoute(root: string, appDir: string): boolean {
	try {
		return readdirSync(join(root, appDir)).some((name) => OWN.test(name));
	} catch (err) {
		// A missing routes directory (or a file where it should be) is no route.
		const code = err instanceof Error && "code" in err ? err.code : undefined;
		if (code === "ENOENT" || code === "ENOTDIR") return false;
		throw err;
	}
}

// The route as a re-export of the page a design system draws, so the app's
// copy holds no markup and follows the package.
export function notFoundRouteSource(module: string): string {
	return [
		"// Stack's page for an address no route serves, written once while this file is absent.",
		"// Replace it with your own route to draw another page; delete it and `stack generate` writes it again.",
		`export { default } from ${JSON.stringify(module)};`,
		"",
	].join("\n");
}
