import type { AppPlugin } from "@slotform/vite";
import type { RouterOptions } from "../types.ts";

// The router plugin call on a set of options: docs/architecture/plugins/react.md, "Router plugin".
export function routerPluginFor(options: RouterOptions): AppPlugin {
	return {
		imports: [
			{ source: "@tanstack/router-plugin/vite", named: ["tanstackRouter"] },
			{ source: "node:url", named: ["fileURLToPath"] },
		],
		call: {
			kind: "call",
			callee: { kind: "identifier", name: "tanstackRouter" },
			args: [
				{
					kind: "object",
					properties: [
						{ key: "target", value: { kind: "string", value: "react" } },
						{
							key: "autoCodeSplitting",
							value: { kind: "boolean", value: options.autoCodeSplitting },
						},
						{ key: "routesDirectory", value: options.routesDirectory },
						{ key: "generatedRouteTree", value: options.generatedRouteTree },
					],
				},
			],
		},
	};
}
