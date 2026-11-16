import type { RosterEntry } from "./shared.ts";

// A code a camera reads: `value` is the text it carries, `label` what it
// is for, its accessible name (the text is never drawn nor read aloud).
// Its modules are crisp-edged in a dark ink on a light tile in both
// modes, inside a four-module quiet zone; the tile is a square at its
// container's width down to the image's height cap, centred where the
// cap narrows it, so the code is never cropped. A `value` that is a
// selection paints the tile at that square until the read lands. It
// takes no press: the act beside it (a copy of the link) carries the text.
export const qrCodeEntry: RosterEntry = {
	props: ["value", "label"],
	draws: ["PAINT.kind.box", "QR_CODE", "QR_CODE_INK"],
	states: ["rest", "loading"],
	motion: ["wait"],
	owns: {
		colors: ["qr-tile", "qr-ink", "skeleton"],
		radii: ["card"],
		sizes: ["line-body"],
	},
};

// QrCode: a square tile at its container's width down to the image's height
// cap, centred where the cap narrows it, so the code is never cropped; light
// in both modes at the card's radius, its quiet zone the tile's own ground
// (`QR_CODE`). Its modules are the dark ink (`QR_CODE_INK`).
export const QR_CODE =
	"w-full max-w-[calc(20*var(--spacing-line-body))] aspect-square self-center rounded-card bg-qr-tile";
export const QR_CODE_INK = "text-qr-ink";
