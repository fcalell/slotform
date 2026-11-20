import { moreMenu } from "@slotform/ui-core/acts";
import type { IconLinkAct } from "@slotform/ui-core/descriptors";
import { paintText } from "@slotform/ui-core/paint";
import { useOffer } from "@slotform/ui-core/react/acts";
import { useDrawsFailure, useSelections } from "@slotform/ui-core/react/read";
import {
	ReasonHostContext,
	useReasonShown,
} from "@slotform/ui-core/react/reason";
import { useTouched } from "@slotform/ui-core/react/touched";
import { useWords } from "@slotform/ui-core/react/words";
import { type Datum, isSelection } from "@slotform/ui-core/read";
import { pressStands } from "@slotform/ui-core/reason";
import { text } from "@slotform/ui-core/variants";
import { Text as RNText } from "react-native";
import { IconButtonBase } from "../../atoms/button/glyph";
import type { Act, IconAct, MenuEntry } from "../../lib/act";
import { asIconAct, wiringOf } from "../../lib/act";
import { FadingText, flowIn } from "../../lib/motion";
import { Button } from "../button";
import { ButtonBase } from "../button/base";
import { MenuBase } from "../menu/base";

// A blocked act's reason draws on the row's own line, so the act keeps its
// place; the act is handed the host.
export function useReasonLine(blocked: string | undefined) {
	const { host, reason } = useReasonShown(blocked);
	const line =
		reason !== undefined ? (
			<FadingText
				key={reason}
				entering={flowIn()}
				className={text({ role: "meta" })}
			>
				{reason}
			</FadingText>
		) : null;
	return { host, line };
}

// Whether the row has a more act to draw: a selection may still answer none,
// the box standing meanwhile.
export function hasMore(more: Datum<readonly MenuEntry[] | undefined>) {
	return isSelection(more) || Boolean(more?.length);
}

// The act waiting for its read: an icon act's box, or a labelled act's (an
// entry's).
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
	if (waits) return <PaintedAct at={at} icon />;
	if (!given) return null;
	const icon = asIconAct(given);
	if (blocked !== undefined)
		return (
			<IconButtonBase
				icon={icon.icon}
				label={icon.label}
				onAct={() => stand(blocked)}
			/>
		);
	return <Button glyph {...icon} />;
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
	if (!(pressStands(blocked, props.stood) || touched)) return null;
	return <RNText className={text({ role: "meta" })}>{blocked}</RNText>;
}

// The row's more act: painted while its read lands, the one blocked item with
// the sentence once it ended, nothing when it answers none.
export function RowMore(props: {
	more: Datum<readonly MenuEntry[] | undefined> | undefined;
	named: string;
}) {
	useDrawsFailure([props.more]);
	const [offer] = useSelections([props.more]);
	const words = useWords();
	const { painted, items } = moreMenu(words, offer);
	const label = `${words.more} ${props.named}`;
	if (painted)
		return <MenuBase label={label} title={props.named} items={[]} painted />;
	if (!items.length) return null;
	return <MenuBase label={label} title={props.named} items={items} />;
}

// An entry's act beside its input: a labelled button, painted while the row is.
export function ActButton(props: {
	act: Act;
	host: ReturnType<typeof useReasonLine>["host"];
	painted: boolean;
	at: number;
}) {
	const { act, host, painted, at } = props;
	if (painted) return <PaintedAct at={at} />;
	return (
		<ReasonHostContext.Provider value={host}>
			<ButtonBase
				act={act.destructive ? "destructive" : "secondary"}
				label={act.label}
				onAct={act.onAct}
				blocked={act.blocked}
				{...wiringOf(act)}
			/>
		</ReasonHostContext.Provider>
	);
}
