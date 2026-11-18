// The widths a screen is checked at: docs/architecture/plugins/screens.md, "Rubric widths".
// The narrowest phone (the touch set), a laptop and a desktop.
export const PHONE = 320;
export const LAPTOP = 1280;
export const DESKTOP = 1920;
export const WIDTHS = [PHONE, LAPTOP, DESKTOP] as const;

// The viewport's height at every width.
export const HEIGHT = 800;

// The viewport a browser session opens at, before the run sets a story's width.
export const START_VIEWPORT = { width: LAPTOP, height: HEIGHT };

// The tallest viewport a full-page shot grows to: a page whose content grows
// with the viewport (taller than `100vh`) would otherwise never stop hiding some.
export const SHOT_MAX_HEIGHT = 16384;
