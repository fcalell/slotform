// Local-dev hostnames: docs/architecture/plugins/api.md, "Local and dev origins".
const LOCAL_HOSTNAMES = new Set([
	"localhost",
	"127.0.0.1",
	"[::1]",
	"::1",
	"0.0.0.0",
]);

export function isLocalOrigin(origin: string): boolean {
	try {
		const { hostname } = new URL(origin);
		if (LOCAL_HOSTNAMES.has(hostname)) return true;
		// Covers `*.localhost` (RFC 6761 reserved), `*.localdomain`
		// (common on Linux /etc/hosts), and `localhost.localdomain`.
		if (hostname.endsWith(".localhost")) return true;
		if (hostname.endsWith(".localdomain")) return true;
		if (hostname === "localhost.localdomain") return true;
		return false;
	} catch {
		// A string `URL` cannot parse is not a local origin.
		return false;
	}
}
