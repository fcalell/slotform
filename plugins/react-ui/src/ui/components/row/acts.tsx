import { moreMenu } from "@slotform/ui-core/acts";
import type { IconLinkAct } from "@slotform/ui-core/descriptors";
import { paintText } from "@slotform/ui-core/paint";
import { useOffer } from "@slotform/ui-core/react/acts";
import { useDrawsFailure, useSelections } from "@slotform/ui-core/react/read";
import { ReasonHostContext } from "@slotform/ui-core/react/reason";
import { useTouched } from "@slotform/ui-core/react/touched";
import { useWords } from "@slotform/ui-core/react/words";
import { type Datum, isSelection } from "@slotform/ui-core/read";
import { pressStands } from "@slotform/ui-core/reason";
import { useMemo } from "react";
import { IconButtonBase } from "../../atoms/button/glyph.tsx";
import { Reason, type useReasonLine } from "../../atoms/button/reason.tsx";
import {
	type Act,
	type IconAct,
	type MenuEntry,
	wiringOf,
} from "../../lib/act.ts";
import { ButtonBase } from "../button/base.tsx";
import { IconActFace } from "../button/face.tsx";
import { MenuBase } from "../menu/base.tsx";

/** Whether the row has a more act to draw: a selection may still answer none, the box standing meanwhile. */
export function hasMore(more: Datum<readonly MenuEntry[] | undefined>) {
	return isSelection(more) || Boolean(more?.length);
}

export function PaintedAct({
	at,
	icon = false,
}: {
	at: number;
	icon?: boolean;
}) {
	if (icon) return <IconButtonBase icon="Ellipsis" label="" painted />;
	return <ButtonBase act="secondary" label={paintText("word", at)} painted />;
}

// The row's act at its end, its icon; a press on it while blocked tells the
// row whose line draws the reason.
export function RowAct(props: {
	act: Datum<IconAct | IconLinkAct | undefined>;
	stand: (reason: string) => void;
	at: number;
}) {
	const { act, stand, at } = props;
	useDrawsFailure([act]);
	const { waits, given, blocked } = useOffer(act);
	const host = useMemo(
		() => (blocked === undefined ? undefined : () => stand(blocked)),
		[blocked, stand],
	);
	if (waits) return <PaintedAct at={at} icon />;
	if (!given) return null;
	return (
		<ReasonHostContext value={host}>
			<IconActFace act={given} />
		</ReasonHostContext>
	);
}

// The reason the row's act is blocked under, on the row's own line: shown once
// the act was pressed while blocked, or its form is touched.
export function ActLine(props: {
	act: Datum<IconAct | IconLinkAct | undefined>;
	stood: string | undefined;
}) {
	const { blocked } = useOffer(props.act);
	const { touched } = useTouched();
	if (blocked === undefined) return null;
	return (
		<Reason shown={pressStands(blocked, props.stood) || touched}>
			{blocked}
		</Reason>
	);
}

// The row's more act: painted while its read lands, the one blocked item with
// the sentence once it ended, nothing when it answers none. `extra` are the
// entries the platform adds after the row's own (a drag's, a reorder's).
export function RowMore(props: {
	more: Datum<readonly MenuEntry[] | undefined> | undefined;
	extra?: readonly MenuEntry[];
	named: string;
	tabIndex?: -1;
}) {
	useDrawsFailure([props.more]);
	const [offer] = useSelections([props.more]);
	const words = useWords();
	const { painted, items } = moreMenu(words, offer);
	const label = `${words.more} ${props.named}`;
	if (painted)
		return <MenuBase label={label} title={props.named} items={[]} painted />;
	const all = props.extra?.length ? [...items, ...props.extra] : items;
	if (!all.length) return null;
	return (
		<MenuBase
			label={label}
			title={props.named}
			items={all}
			tabIndex={props.tabIndex}
		/>
	);
}

export function ActButton(props: {
	act: Act;
	host: ReturnType<typeof useReasonLine>["host"];
	painted: boolean;
	at: number;
}) {
	const { act, host, painted, at } = props;
	if (painted) return <PaintedAct at={at} />;
	return (
		<ReasonHostContext value={host}>
			<ButtonBase
				act={act.destructive ? "destructive" : "secondary"}
				label={act.label}
				onAct={act.onAct}
				blocked={act.blocked}
				{...wiringOf(act)}
			/>
		</ReasonHostContext>
	);
}
