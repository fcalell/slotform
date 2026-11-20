import { cn } from "@slotform/ui-core/cn";
import { usePort } from "@slotform/ui-core/react/port";
import { useWindowMore } from "@slotform/ui-core/react/read";
import { useWords } from "@slotform/ui-core/react/words";
import { fetchesMore, type More, type Read } from "@slotform/ui-core/read";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { ButtonBase } from "../components/button/base.tsx";
import { StateLine } from "./read.tsx";

// The room under a row of the viewer's own pressing, as a state line carries.
const SHOW = "flex items-center pb-gap";
// A collection that bleeds the card's inset (a Section's sheet) has its
// rows pad themselves with it, so its more row does the same; the quiet act
// hangs its wash out by the control's own padding, its label at the rows' text,
// and gives way to the row's width, its label truncating.
const INSET = "px-pad";
const HANG = "-mx-pad flex min-w-0 max-w-full";

interface MoreProps {
	read: Read<unknown>;
	empty: boolean;
	paint: () => ReactNode;
	/** The collection's rows pad themselves with the card's inset, so this row does too. */
	inset?: boolean;
	/** The rows mounted reach the last one loaded (`useReach`): a long collection loads its next page without a press. */
	scrolled?: boolean;
}

/** A collection's last row over a read that pages (a pages read, or a window read the collection does not size to its total): "Show more" while a next page remains (pressed by the viewer; a long windowed list loads it once its mounted rows reach the end, docs/architecture/ui-core/reads.md, "Paging"), the painted rows `paint` draws while it loads, "Couldn't load more" with Retry when it failed. An empty first page that has more is not empty: the next page is fetched at once. Only this row renders on the next page's fetch; the frame is not busy then. */
export function MoreRow(props: MoreProps) {
	return props.read.kind === "window" ? (
		<WindowMoreRow {...props} />
	) : (
		<PagesMoreRow {...props} />
	);
}

function PagesMoreRow(props: MoreProps) {
	return <MoreLine {...props} more={usePort().useNextPage(props.read)} />;
}

function WindowMoreRow(props: MoreProps) {
	return <MoreLine {...props} more={useWindowMore(props.read)} />;
}

function MoreLine(props: MoreProps & { more: More }) {
	const { more, empty, paint, inset, scrolled } = props;
	const words = useWords();
	const { next, fetching, failed } = more;
	const fetch = useRef(more.fetch);
	fetch.current = more.fetch;
	const fetches = fetchesMore(more, empty || scrolled === true);
	useEffect(() => {
		if (fetches) fetch.current();
	}, [fetches]);
	if (fetching || fetches) return paint();
	if (failed) {
		return (
			<div className={inset ? INSET : undefined}>
				<StateLine
					sentence={words.moreFailed}
					act={{ label: words.retry, onAct: more.fetch }}
				/>
			</div>
		);
	}
	if (!next) return null;
	return (
		<div className={cn(SHOW, inset && INSET)}>
			<div className={HANG}>
				<ButtonBase act="quiet" label={words.showMore} onAct={more.fetch} />
			</div>
		</div>
	);
}
