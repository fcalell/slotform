import {
	LOADING_REGIONS,
	type LoadingPaint,
	type LoadingRegion,
} from "@slotform/ui-core/tokens";
import { scriptHash } from "@slotform/vite/csp";
import type { Plugin } from "vite";

type Mode = "light" | "dark";

// The glyph regions a theme paints by the scramble, by region (`theme.loading`;
// a region left out pulses).
type Loading = Partial<Record<LoadingRegion, LoadingPaint>>;

// The mode before first paint: docs/architecture/plugins/react-ui.md, "Mode script and CSP".
export function modeScript(
	defaultMode: Mode | undefined,
	loading: Loading = {},
): string {
	const fallback = defaultMode
		? JSON.stringify(defaultMode)
		: "matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'";
	const follow = defaultMode
		? ""
		: "try{var q=matchMedia('(prefers-color-scheme: dark)');q.addEventListener('change',function(e){var s;try{s=localStorage.getItem('theme')}catch(x){}if(s!=='light'&&s!=='dark')document.documentElement.classList.toggle('dark',e.matches);});}catch(e){}";
	return `(function(){${loadingScript(loading)}try{var t;try{t=localStorage.getItem('theme')}catch(e){}if(t!=='light'&&t!=='dark')t=${fallback};if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}${follow}})();`;
}

// The paint each glyph region waits in: docs/architecture/plugins/react-ui.md, "Mode script and CSP".
function loadingScript(loading: Loading): string {
	return LOADING_REGIONS.filter((region) => loading[region] === "scramble")
		.map(
			(region) =>
				`document.documentElement.dataset.loading${region[0]?.toUpperCase()}${region.slice(1)}='scramble';`,
		)
		.join("");
}

// The CSP that lets the page run `modeScript`: docs/architecture/plugins/react-ui.md, "Mode script and CSP".
export function modeScriptPolicy(
	defaultMode: Mode | undefined,
	loading: Loading = {},
): string {
	return `script-src 'self' ${scriptHash(modeScript(defaultMode, loading))}`;
}

export function themeModePlugin(
	defaultMode?: Mode,
	loading: Loading = {},
): Plugin {
	return {
		name: "fcalell:theme-mode",
		transformIndexHtml: {
			order: "post",
			handler: () => [
				{
					tag: "script",
					injectTo: "head-prepend",
					children: modeScript(defaultMode, loading),
				},
			],
		},
	};
}
