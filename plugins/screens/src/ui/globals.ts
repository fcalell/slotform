import type { PreviewGlobal } from "../types.ts";

export function globalTypes(globals: PreviewGlobal[]) {
	return Object.fromEntries(
		globals.map((g) => [
			g.name,
			{
				description: g.title,
				toolbar: {
					title: g.title,
					items: g.values,
					dynamicTitle: true,
				},
			},
		]),
	);
}

export function initialGlobals(
	globals: PreviewGlobal[],
): Record<string, string> {
	return Object.fromEntries(globals.map((g) => [g.name, g.default]));
}

// The globals the test run has taken the pin off while it visits a width: a
// story that renders again pins the rest, never these.
const unpinned = new Set<string>();

export const unpinGlobal = (name: string): void => {
	unpinned.add(name);
};

export const repinGlobal = (name: string): void => {
	unpinned.delete(name);
};

export function applyGlobals(
	root: Element,
	globals: PreviewGlobal[],
	chosen: Record<string, unknown>,
): void {
	for (const g of globals) {
		if (unpinned.has(g.name)) continue;
		const value = String(chosen[g.name] ?? g.default);
		if ("attribute" in g.apply) {
			root.setAttribute(g.apply.attribute, value);
			continue;
		}
		for (const [name, className] of Object.entries(g.apply.classes)) {
			root.classList.toggle(className, value === name);
		}
	}
}
