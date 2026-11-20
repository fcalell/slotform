import "../.slotform/app.css";
import Providers from "virtual:slotform-providers";
import type { Preview } from "@storybook/react-vite";
import { configure } from "storybook/test";

// A wait (`waitFor`, a `findBy`) holds for five seconds, not testing-library's
// one: under load a state a story waits for can take past a second to draw.
configure({ asyncUtilTimeout: 5_000 });

// The dev checks below judge a scene the viewer sees: a play that ends on a
// press has its state committed but not yet laid out and painted.
const painted = () =>
	new Promise<void>((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
	);

// A story that trips an act dev check of the `query` plugin fails: docs/architecture/ui-core/showcase.md, "Storybook config".
const DEV_CHECK = /returned no promise|nothing drew its failure/;
const tripped: string[] = [];
const logged = console.error;

const preview: Preview = {
	beforeEach: () => {
		tripped.length = 0;
		console.error = (...args: unknown[]) => {
			if (typeof args[0] === "string" && DEV_CHECK.test(args[0]))
				tripped.push(args[0]);
			logged(...args);
		};
	},
	afterEach: async () => {
		await painted();
		console.error = logged;
		if (tripped.length) throw new Error(tripped.join("\n"));
	},
	// The test run is desktop density; touch is a toolbar toggle.
	initialGlobals: { density: "desktop" },
	globalTypes: {
		density: {
			description: "Density pin",
			toolbar: {
				title: "Density",
				items: ["desktop", "touch"],
				dynamicTitle: true,
			},
		},
	},
	decorators: [
		(Story, context) => {
			// Pinned before the story's first paint; a component's scenes carry
			// their own mode.
			document.documentElement.dataset.density = String(
				context.globals.density,
			);
			// The painted fills' breath is still: docs/architecture/ui-core/showcase.md, "Storybook config".
			document.documentElement.style.setProperty("--pulse-name", "none");
			return (
				<Providers>
					<Story />
				</Providers>
			);
		},
	],
};

export default preview;
