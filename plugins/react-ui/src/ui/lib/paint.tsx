import { cn } from "@slotform/ui-core/cn";
import { type PaintRole, paintText, scrambled } from "@slotform/ui-core/paint";
import { PULSE, paint } from "@slotform/ui-core/variants";
import { ScrambledGlyphs } from "./scramble.tsx";

// One breath for the page: docs/architecture/ui-core/reads.md, "One breath".
if (typeof document !== "undefined") {
	document.addEventListener(
		"animationstart",
		(event) => {
			if (event.animationName !== "pulse-fill") return;
			const target = event.target;
			if (!(target instanceof Element)) return;
			for (const one of target.getAnimations()) {
				if (one instanceof CSSAnimation && one.animationName === "pulse-fill") {
					one.startTime = 0;
				}
			}
		},
		true,
	);
}

// A paint fades in after `--wait-delay`: docs/architecture/ui-core/reads.md, "Timing".
const GLYPHS = cn(
	paint({ kind: "glyphs" }),
	"box-decoration-clone select-none",
	PULSE,
);

/** The paint of a part's own box (a mark, a block): its fill, content not drawn. */
export const PAINT_BOX = cn(paint({ kind: "box" }), PULSE);

/** The paint of a control: its own box filled, its content invisible; the control is also `inert`. */
export const PAINT_CONTROL = cn(paint({ kind: "control" }), PULSE);

/** The paint of a control whose children stand in its box (a field's text, a pick's options, a slider's track): the control's paint, each child kept in place and not drawn. */
export const PAINT_CONTROL_HIDDEN = cn(PAINT_CONTROL, "*:invisible");

/** A text region's paint, set inside the region's own text element (no wrapper box): each line box a bar, or, where the theme scrambles the region's kind (`theme.loading`) and the region is one line, the scramble over the same box. It clips where a loaded text ellipsizes (`globals.css`). */
export function Painted({ role, at = 0 }: { role: PaintRole; at?: number }) {
	if (scrambled(role)) return <ScrambledGlyphs role={role} at={at} />;
	return (
		<span
			aria-hidden
			data-painted=""
			// A figure's leading is under `normal`: its bar stands at the region's own line
			// (`globals.css`), so the waiting figure is no taller than the loaded one.
			data-flush={role === "figure" ? "" : undefined}
			className={GLYPHS}
		>
			{paintText(role, at)}
		</span>
	);
}
