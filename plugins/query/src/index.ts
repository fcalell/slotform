import { plugin } from "@fcalell/cli";
import type { ProviderSpec } from "@fcalell/cli/ast";
import { react } from "@fcalell/plugin-react";
import { vite } from "@fcalell/plugin-vite";

export const query = plugin("query", {
	label: "Queries",

	// The binding runs the api's procedures: its client, wire and schema.
	requires: ["api"],

	dependencies: {
		// The query utils `createApiQueryUtils` wraps the client in: plugins/query/README.md, "Install".
		"@orpc/tanstack-query": "^1.16.2",
	},

	guide: [
		{
			page: "reads",
			trigger:
				"Drawing a query on a screen: `.read`, `.at`, `combine`, `Datum`, or which frame holds a read",
		},
		{
			page: "pages-and-streams",
			trigger:
				'Showing a paginated procedure\'s list (scrolled, windowed over a total, or behind "Show more"), or streaming a reply into a `Thread`',
		},
		{
			page: "preload",
			trigger:
				"A route should warm its reads before its screen mounts: `preload` from a `loader`",
		},
		{
			page: "acts",
			trigger:
				"Running a mutation from an act's `onAct`, drawing its failure with `refusal`, or saving a field as it changes (`useDraft`, `useAttempt`)",
		},
		{
			page: "abilities",
			trigger:
				"Gating a control or an act on what the caller may do: `ability` or `useAbility`",
		},
		{
			page: "provider",
			trigger: "Wrapping an app in `QueryProvider`, or passing it `listen`",
		},
	],

	contributes: [
		// One query client around the web app, inside the words.
		react.slots.providers.contribute(
			(): ProviderSpec => ({
				imports: [
					{
						source: "@fcalell/plugin-query/tanstack-query",
						named: ["QueryProvider"],
					},
					{
						source: "@fcalell/ui-core/paint",
						named: ["paintWait"],
					},
				],
				// A read's first write lands no earlier than the minimum hold.
				wrap: {
					identifier: "QueryProvider",
					props: [
						{ name: "hold", value: { kind: "identifier", name: "paintWait" } },
					],
				},
				order: 2,
			}),
		),
		// `tanstack-query` imports `virtual:stack-schema`, which plugin-vite's
		// `schemaPlugin` serves.
		vite.slots.optimizeExclude.contribute(() => [
			"@fcalell/plugin-query/tanstack-query",
		]),
	],
});
