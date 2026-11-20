import type {
	Act as ActData,
	Decision,
	IconName,
	LinkAct,
} from "@slotform/ui-core/descriptors";
import type { ProcedureCall } from "@slotform/ui-core/form";
import { createActs } from "@slotform/ui-core/react/acts";
import type { ActSheetProps } from "../components/sheet/index.tsx";
import { navigate } from "./navigate.ts";
import { toast } from "./toast.ts";

export type { ActSheetProps };

/** A sheet for an act's `sheet`, typed by the procedure its form submits: `P` is read off the form's `act`, so `onDone` hears that procedure's output and the fields are checked against its input. An act's region holds acts of different procedures, which a type cannot follow, so the sheet leaves here as the procedure-less `ActSheetProps` the region takes. */
export function sheetOf<P extends ProcedureCall>(
	sheet: ActSheetProps<P>,
): ActSheetProps {
	// The one place the procedure is forgotten: the sheet outlet draws it through
	// `Sheet`, which reads the form's own procedure, never this type's.
	return sheet as unknown as ActSheetProps;
}

/** What an act does when pressed, exclusively: it runs (`onAct`) or it opens a modal task (`sheet`: the press opens it in the sheet outlet with the props it holds then, and it closes on dismiss or once the sheet's submit resolves). A press that opens a sheet runs nothing. */
type Pressed<F> =
	| { onAct: F; sheet?: never }
	| { sheet: ActSheetProps; onAct?: never };

/** An act as the platform draws it: the ui-core act with its `onAct` or the `sheet` it opens. */
export type Act = Omit<ActData, "onAct"> & Pressed<ActData["onAct"]>;
/** A descriptor's acts as the platform draws them: each act (one, or a list of them) widened with the `sheet` it may open. */
export type Sheeted<T> = T extends readonly (infer E)[]
	? readonly Sheeted<E>[]
	: T extends { onAct: infer F }
		? Omit<T, "onAct"> & Pressed<F>
		: T;
/** An act of a region that requires its glyph. */
export type IconAct = Act & { icon: IconName };
/** What a menu holds: acts that run and links that go. */
export type MenuEntry = Act | LinkAct;

/** The wiring an act carries beside its `onAct`, which a host hands to the control that draws it. */
interface Wiring {
	confirm?: Decision;
	done?: string;
	to?: string;
	sheet?: ActSheetProps;
}

/** An act's wiring, as a host hands it to the control that draws the act. */
export function wiringOf(act: Wiring): Wiring {
	return {
		confirm: act.confirm,
		done: act.done,
		to: act.to,
		sheet: act.sheet,
	};
}

export const { useAct, useHeldDraft } = createActs({ toast, open: navigate });
