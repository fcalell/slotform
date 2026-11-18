// Local-dev hostnames: docs/architecture/plugins/api.md, "Local and dev origins".
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

export function isLocalOrigin(origin: string): boolean {
	try {
		const { hostname } = new URL(origin);
		// `*.localhost` is reserved (RFC 6761); `*.localdomain` is common in
		// Linux /etc/hosts.
		return (
			LOCAL_HOSTNAMES.has(hostname) ||
			hostname.endsWith(".localhost") ||
			hostname.endsWith(".localdomain")
		);
	} catch {
		// A string `URL` cannot parse is not a local origin.
		return false;
	}
}
