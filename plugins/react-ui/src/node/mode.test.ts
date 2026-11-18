import assert from "node:assert/strict";
import { test } from "node:test";
import { modeScript } from "./mode.ts";

// The script run against a page stood in: the stored choice (`blocked` when
// storage throws), the system's scheme, the `dark` class and the dataset on
// the root, with the system's change listener the script registers handed
// back to fire.
function page(
	stored: string | null | "blocked",
	dark: boolean,
	...config: Parameters<typeof modeScript>
) {
	const classes = new Set<string>();
	const dataset: Record<string, string> = {};
	let choice = stored;
	let listener: ((event: { matches: boolean }) => void) | undefined;
	const document = {
		documentElement: {
			dataset,
			classList: {
				add: (name: string) => classes.add(name),
				toggle: (name: string, force: boolean) =>
					force ? classes.add(name) : classes.delete(name),
			},
		},
	};
	const localStorage = {
		getItem: () => {
			if (choice === "blocked") throw new Error("SecurityError");
			return choice;
		},
	};
	const matchMedia = () => ({
		matches: dark,
		addEventListener: (_: string, fn: typeof listener) => {
			listener = fn;
		},
	});
	new Function("document", "localStorage", "matchMedia", modeScript(...config))(
		document,
		localStorage,
		matchMedia,
	);
	return {
		dark: () => classes.has("dark"),
		dataset,
		listens: () => listener !== undefined,
		store: (value: string) => {
			choice = value;
		},
		system: (matches: boolean) => listener?.({ matches }),
	};
}

test("a mode that came from the system follows the system's change", () => {
	const p = page(null, false, undefined);
	assert.equal(p.dark(), false);
	p.system(true);
	assert.equal(p.dark(), true);
	p.system(false);
	assert.equal(p.dark(), false);
});

test("a stored choice is the mode and is not moved by the system, even one stored after load", () => {
	const kept = page("dark", false, undefined);
	assert.equal(kept.dark(), true);
	assert.equal(kept.listens(), true);
	kept.system(false);
	assert.equal(kept.dark(), true);
	const later = page(null, true, undefined);
	later.store("dark");
	later.system(false);
	assert.equal(later.dark(), true);
});

test("a default mode is the page's own and listens to nothing", () => {
	const dark = page(null, false, "dark");
	assert.equal(dark.dark(), true);
	assert.equal(dark.listens(), false);
	const light = page(null, true, "light");
	assert.equal(light.dark(), false);
	assert.equal(light.listens(), false);
});

test("blocked storage reads as no stored choice", () => {
	assert.equal(page("blocked", true, undefined).dark(), true);
	assert.equal(page("blocked", false, "dark").dark(), true);
});

test("each scrambled region is written on the root, a pulsed one is not", () => {
	const p = page(null, false, undefined, {
		text: "scramble",
		id: "scramble",
		figure: "pulse",
	});
	assert.deepEqual(p.dataset, {
		loadingText: "scramble",
		loadingId: "scramble",
	});
});
