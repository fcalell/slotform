import type { Plugin } from "vite";

// The canvas layout module stays out of the pre-bundle: docs/architecture/plugins/react-ui.md, "Canvas serving".
export function canvasPlugin(): Plugin {
	return {
		name: "fcalell:canvas",
		config: () => ({
			optimizeDeps: {
				exclude: ["@fcalell/plugin-react-ui/lib/canvas-layout"],
				include: ["@fcalell/plugin-react-ui > elkjs/lib/elk-api.js"],
			},
		}),
	};
}
