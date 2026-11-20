import { allowScript, scriptHash } from "@slotform/vite/csp";
import type { Plugin } from "vite";

// React Refresh's preamble in the dev policy: docs/architecture/plugins/react.md, "Dev CSP and React Refresh".
export function refreshPolicyPlugin(preambleCode: string): Plugin {
	return {
		name: "fcalell:refresh-policy",
		apply: "serve",
		config(config) {
			const headers = config.server?.headers ?? {};
			const name = Object.keys(headers).find(
				(key) => key.toLowerCase() === "content-security-policy",
			);
			const policy = name === undefined ? undefined : headers[name];
			if (name === undefined || typeof policy !== "string") return;
			const preamble = preambleCode.replace("__BASE__", config.base ?? "/");
			return {
				server: {
					headers: { [name]: allowScript(policy, scriptHash(preamble)) },
				},
			};
		},
	};
}
