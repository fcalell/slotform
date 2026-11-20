import type { AppLockup } from "@slotform/react-ui/lib/lockup";

// The app's lockup as the generated providers mount it, inline so the scene
// needs no asset pipeline: a logo for each mode.
const logo = (ground: string, ink: string) =>
	`data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="14" fill="${ground}"/><path d="M14 46 32 14l18 32h-9l-9-17-9 17z" fill="${ink}"/></svg>`,
	)}`;
export const MARK: AppLockup = {
	src: logo("#2f3a45", "#9fb7c9"),
	dark: logo("#9fb7c9", "#2f3a45"),
	name: "Acme",
};
