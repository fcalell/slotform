import { cn } from "@fcalell/ui-core/cn";
import { useWords } from "@fcalell/ui-core/react/words";
import { CODE_NAME, FIGURES } from "@fcalell/ui-core/variants";
import { useCopy } from "../../lib/copy.ts";
import { Decoded } from "../../lib/slot.tsx";
import { Button } from "../button/index.tsx";

// An identifier (`copyable`) is the mono, carrying the body ink as the value
// beside it; too long for its room it cuts in its middle, its stem truncating
// to the room and its tail standing whole (`valueCut`). In a row that wraps it
// stands whole, at a path's or URL's separators first, then anywhere: a
// fingerprint or a key has no spaces.
const ID = "flex min-w-0 text-ink-body";
const STEM = "min-w-0 truncate";
const WHOLE = "min-w-0 wrap-anywhere";
const TAIL = "shrink-0";

/** A copyable id bare in the mono, cut as the row cuts it, or `whole` (the row's `wrap`) on as many lines as it takes, its `stem` the whole value: its stem is one slot across the waiting form and the loaded one, so it decodes if it waited. Outside the package's exports. */
export function IdValue(props: {
	painted?: boolean;
	at?: number;
	stem?: string;
	tail?: string;
	whole?: boolean;
}) {
	return (
		<span className={cn(CODE_NAME, ID, FIGURES)}>
			<span className={props.whole ? WHOLE : STEM}>
				<Decoded
					role="id"
					painted={props.painted}
					at={props.at}
					text={props.stem}
					broken={props.whole}
				/>
			</span>
			{props.tail ? <span className={TAIL}>{props.tail}</span> : null}
		</span>
	);
}

/** The copy act: a check and the word Copied for two seconds once copied. Outside the package's exports. */
export function CopyAct({ label, value }: { label: string; value: string }) {
	const words = useWords();
	const [done, copy] = useCopy();
	return (
		<Button
			glyph
			icon={done ? "Check" : "Copy"}
			label={done ? words.copied : `${words.copy} ${label}`}
			onAct={() => copy(value)}
		/>
	);
}
