import { useEffect } from "react";

// Base UI's focus guards without `aria-hidden`: docs/architecture/plugins/react-ui.md, "Accessibility".
const GUARD = "[data-base-ui-focus-guard]";

function quiet(root: ParentNode) {
	if (root instanceof Element && root.matches(GUARD))
		root.removeAttribute("aria-hidden");
	for (const guard of root.querySelectorAll(GUARD))
		guard.removeAttribute("aria-hidden");
}

// One observer for every popup on the page, counted by the popups that ask.
let asked = 0;
let watch: MutationObserver | undefined;

/** Keeps Base UI's focus guards, which a popup draws as it opens, out of `aria-hidden` while this component is mounted. Outside the package's exports. */
export function useQuietGuards(): void {
	useEffect(() => {
		asked += 1;
		if (asked === 1) {
			quiet(document);
			watch = new MutationObserver((records) => {
				for (const record of records)
					for (const node of record.addedNodes)
						if (node instanceof Element) quiet(node);
			});
			watch.observe(document.body, { childList: true, subtree: true });
		}
		return () => {
			asked -= 1;
			if (asked === 0) {
				watch?.disconnect();
				watch = undefined;
			}
		};
	}, []);
}
