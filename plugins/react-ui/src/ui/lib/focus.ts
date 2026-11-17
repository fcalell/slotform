import { type RefObject, useEffect, useRef } from "react";

// What a viewer's Tab reaches in a region: anything rendered whose effective
// tab index is 0 or more, so a button, a field, a roving radio group's one tab
// stop and a scroller that took a stop all count, in document order.
export function isTabbable(element: HTMLElement): boolean {
	return (
		element.tabIndex >= 0 &&
		!("disabled" in element && element.disabled) &&
		element.closest('[hidden], [inert], [aria-hidden="true"]') === null &&
		element.checkVisibility()
	);
}

// The first tabbable element in `root`; `only` narrows it to those matching a
// selector (a foot hands focus to its typing control, not to the attach act
// ahead of it).
export function firstTabbable(
	root: HTMLElement | null,
	only?: string,
): HTMLElement | undefined {
	const all = root?.querySelectorAll<HTMLElement>("*") ?? [];
	return Array.from(all).find(
		(element) => isTabbable(element) && (!only || element.matches(only)),
	);
}

// Focuses the first tabbable element in `root`, narrowed as `firstTabbable` is.
export function focusFirst(root: HTMLElement | null, only?: string): boolean {
	const first = firstTabbable(root, only);
	first?.focus();
	return first !== undefined;
}

// What a form's first field is: a typing control, a native select, a pick's
// trigger, or the tab stop of a pick drawn as its options (a radio, a box, an
// option of a listbox) or of a switch. A pick of options standing first is the
// first field, so a sheet opens on it, at its top, and not on a later field
// it would scroll down to.
export const FIELDS =
	"input, textarea, select, [role='combobox'], [role='radio'], [role='checkbox'], [role='option'], [role='switch']";

// Whether focus is inside a region, as the page last moved it. A focus or a
// press landing outside the region ends the hold; one inside begins it. The
// removal of the focused element fires neither, so the hold survives it: that
// is how a region learns its focus left with its own page.
function trackHold(
	region: () => HTMLElement | null,
	hold: { current: boolean },
): () => void {
	const follow = (event: Event) => {
		hold.current =
			event.target instanceof Node &&
			(region()?.contains(event.target) ?? false);
	};
	document.addEventListener("focusin", follow, true);
	document.addEventListener("pointerdown", follow, true);
	return () => {
		document.removeEventListener("focusin", follow, true);
		document.removeEventListener("pointerdown", follow, true);
	};
}

// A foot region hands focus to its first field: docs/architecture/plugins/react-ui.md, "Focus".
export function useFootFocus(region: RefObject<HTMLElement | null>) {
	const held = useRef(false);
	useEffect(() => trackHold(() => region.current, held), [region]);
	useEffect(() => {
		if (held.current && document.activeElement === document.body) {
			held.current = false;
			focusFirst(region.current, "input, textarea");
		}
	});
}

// The opener of a sheet opened from a popup's act: docs/architecture/plugins/react-ui.md, "Focus".
const OPENER_WINDOW = 1000;
let opener: { element: HTMLElement | null; at: number } | undefined;

// The trigger of the popup that is open: a pick's or a menu's trigger, or a
// touch sheet's, which carry `aria-expanded` while it stands.
export function expandedTrigger(): HTMLElement | null {
	const all = document.querySelectorAll<HTMLElement>(
		'[aria-expanded="true"]:is([aria-haspopup], [role="combobox"])',
	);
	return all.item(all.length - 1);
}

// An act in a popup calls this before it closes the popup and runs.
export function rememberOpener(element: HTMLElement | null) {
	opener = { element, at: Date.now() };
}

// The sheet that opens takes the remembered trigger once, if the act that
// named it ran a moment ago.
function claimOpener(): HTMLElement | null {
	const held = opener;
	opener = undefined;
	return held && Date.now() - held.at <= OPENER_WINDOW ? held.element : null;
}

// Focus on the page a sheet left standing: docs/architecture/plugins/react-ui.md, "Focus".
function focusPage(): void {
	// Our own focus lands here too, which ends the chain on success.
	let moved = false;
	const note = () => {
		moved = true;
	};
	document.addEventListener("focusin", note, true);
	const attempt = (left: number) => {
		if (!moved) {
			for (const page of document.querySelectorAll<HTMLElement>("[data-page]"))
				if (focusFirst(page)) break;
			if (!moved && left > 0) {
				setTimeout(() => attempt(left - 1), 100);
				return;
			}
		}
		document.removeEventListener("focusin", note, true);
	};
	attempt(5);
}

// A closing sheet hands focus back: docs/architecture/plugins/react-ui.md, "Focus".
export function useReturnFocus(
	open: boolean,
	region: RefObject<HTMLElement | null>,
) {
	const held = useRef(false);
	const turn = useRef(0);
	useEffect(() => trackHold(() => region.current, held), [region]);
	useEffect(() => {
		if (!open) return;
		const mine = ++turn.current;
		const active = document.activeElement;
		// A sheet opened with focus nowhere holds it from the start: its own
		// first focus lands a frame later, and an Escape before then still
		// leaves the page to take focus, not the body.
		held.current =
			active === document.body || (region.current?.contains(active) ?? false);
		const from =
			claimOpener() ??
			(active instanceof HTMLElement &&
			active !== document.body &&
			!region.current?.contains(active)
				? active
				: null);
		// Acts once the sheet is gone: its leave played, or its route unmounted it.
		let frames = 0;
		const settle = () => {
			if (turn.current !== mine) return;
			if (region.current && frames++ < 120) {
				requestAnimationFrame(settle);
				return;
			}
			if (!held.current || document.activeElement !== document.body) return;
			held.current = false;
			if (from?.isConnected && isTabbable(from)) from.focus();
			else focusPage();
		};
		return () => {
			setTimeout(settle, 0);
		};
	}, [open, region]);
}

// A Pane opened from a press takes the keyboard: docs/architecture/plugins/react-ui.md, "Focus".
export function usePaneFocus(pane: HTMLElement | null) {
	useEffect(() => {
		if (!pane) return;
		const from = document.activeElement?.closest("[data-page]");
		if (!from || from === pane || pane.contains(from)) return;
		focusFirst(pane);
	}, [pane]);
}
