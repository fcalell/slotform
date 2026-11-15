import { cn } from "@fcalell/ui-core/cn";
import type {
	IconLinkAct,
	Option,
	OptionGroup,
	OptionPick,
} from "@fcalell/ui-core/descriptors";
import { optionLeading } from "@fcalell/ui-core/list-state";
import { useSelections } from "@fcalell/ui-core/react/read";
import { type Datum, paints } from "@fcalell/ui-core/read";
import {
	FIELD_PLACEHOLDER,
	placeRow,
	placeRowGlyph,
	SHELL_RAIL_ENTRY,
	SHELL_RAIL_GLYPH,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { IconAct } from "../../lib/act.ts";
import { Painted } from "../../lib/paint.tsx";
import { AvatarBase } from "../avatar/base.tsx";
import { Avatar } from "../avatar/index.tsx";
import { Icon } from "../icon/index.tsx";
import { HeldPicker } from "../picker/base.tsx";

const ROW_PRESS = "hover:bg-wash-hover active:bg-wash-press";
// The leading slot takes a place row glyph's ink: a button resets its colour.
const GLYPH = "flex shrink-0";
const END = "flex shrink-0 text-ink-mark";
// The trigger is a place row: its leading slot holds the glyph the caller
// gives (the app's mark), else the current option's icon at the row glyph's
// size, else its avatar.
const TRIGGER = "flex items-center w-full focus-visible:-outline-offset-2";
const NAME = "truncate grow text-left";

/** What the app is looking at and can switch to: an `OptionPick` whose `options` and `value` may be selections. A selection that waits paints the avatar and the name and keeps the chevron, the trigger inert; a read that ended, or a value no option matches, draws no name, and options that landed empty (none to switch to yet) draw the `placeholder` in its ink. */
export interface Switcher
	extends Omit<OptionPick, "options" | "value" | "act"> {
	options: Datum<readonly Option[] | readonly OptionGroup[]>;
	value?: Datum<string>;
	/** The act that makes a new option, ending the list under a hairline: an act that runs, a sheet it opens, or a link to where it is made. */
	act?: IconAct | IconLinkAct;
}

function flatten(
	options: readonly Option[] | readonly OptionGroup[],
): readonly Option[] {
	const entries: readonly (Option | OptionGroup)[] = options;
	return entries.flatMap((entry) =>
		"options" in entry ? entry.options : [entry],
	);
}

// The switcher is a pick (its options with their avatars, the current one
// ticked, the act that makes a new one under a hairline), drawn as a place
// row in the Shell's sidebar and on its touch layer. Outside the package's
// exports.
export function SwitcherPick(props: {
	switcher: Switcher;
	glyph?: ReactNode;
	// Drawn on the rail: its glyph keeps the control square, its name and
	// chevron uncovered with the rail's labels, and a pointer coming onto it (`wait`)
	// or a focus opens the rail.
	onExpand?: (wait: boolean) => void;
}) {
	const { switcher, glyph, onExpand } = props;
	const rail = onExpand !== undefined;
	const [options, value] = useSelections([
		switcher.options,
		switcher.value,
	] as const);
	// Pending: a read still to land. Absent: it ended, or no option matches the
	// value; the name slot then draws nothing, never the switcher's own label.
	// Empty: the options landed and there are none, so the placeholder stands.
	const pending = paints(options) || paints(value);
	const listed = options.painted ? undefined : flatten(options.value);
	const current = value.painted
		? undefined
		: listed?.find((option) => option.value === value.value);
	const name = current?.label;
	const hint = listed?.length === 0 ? switcher.placeholder : undefined;
	const lead = optionLeading(current);
	return (
		<HeldPicker
			label={switcher.label}
			options={switcher.options}
			value={switcher.value}
			onChange={switcher.onChange}
			act={switcher.act}
			drawn={(handed, open) => (
				<button
					{...handed}
					onPointerEnter={(event) => {
						handed.onPointerEnter?.(event);
						if (event.pointerType !== "touch") onExpand?.(true);
					}}
					onFocus={(event) => {
						handed.onFocus?.(event);
						onExpand?.(false);
					}}
					type="button"
					inert={pending || undefined}
					aria-label={name ? `${switcher.label}, ${name}` : switcher.label}
					className={cn(
						placeRow({ state: open ? "active" : "rest" }),
						TRIGGER,
						rail && SHELL_RAIL_ENTRY,
						!open && !pending && ROW_PRESS,
					)}
				>
					<span
						aria-hidden
						className={cn(placeRowGlyph(), GLYPH, rail && SHELL_RAIL_GLYPH)}
					>
						{glyph ??
							(pending ? (
								<AvatarBase name="" painted />
							) : lead.icon ? (
								<Icon name={lead.icon} />
							) : name ? (
								<Avatar name={name} src={lead.avatar?.src} />
							) : null)}
					</span>
					<span
						className={cn(
							text({ role: "body" }),
							hint === undefined
								? textStrong({ role: "body" })
								: FIELD_PLACEHOLDER,
							NAME,
						)}
					>
						{pending ? <Painted role="name" /> : (name ?? hint)}
					</span>
					<span className={END}>
						<Icon name="ChevronsUpDown" />
					</span>
				</button>
			)}
		/>
	);
}
