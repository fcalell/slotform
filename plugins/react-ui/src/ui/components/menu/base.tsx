import { Dialog } from "@base-ui/react/dialog";
import { Menu as Control } from "@base-ui/react/menu";
import { cn } from "@fcalell/ui-core/cn";
import {
	LAYER_POPOVER,
	menu,
	menuGroup,
	menuLabel,
	OPTION_ROW,
	POPOVER,
	row,
	text,
} from "@fcalell/ui-core/variants";
import { type KeyboardEvent, type ReactNode, use, useState } from "react";
import { IconButtonBase } from "../../atoms/button/glyph.tsx";
import { Icon } from "../../atoms/icon/index.tsx";
import type { MenuEntry } from "../../lib/act.ts";
import { useAct } from "../../lib/act.ts";
import { expandedTrigger, rememberOpener } from "../../lib/focus.ts";
import { useQuietGuards } from "../../lib/guards.ts";
import { spacing } from "../../lib/measure.ts";
import { useTouch } from "../../lib/media.ts";
import { follow } from "../../lib/navigate.ts";
import { PortalContainer } from "../../lib/portal.ts";
import { ActSheet } from "../sheet/act.tsx";
import { SheetHead } from "../sheet/head.tsx";
import { SheetLayer } from "../sheet/layer.tsx";

// Base UI focuses the popup itself after a pointer open; its rows carry the ring.
const POPUP = "flex flex-col outline-none";
const POSITIONER = "z-(--layer-popover)";
const GROUP = "flex flex-col";
// A row the keyboard reaches rings inset over its wash, which alone sits
// under the 3:1 a state needs; the pointer's highlight is the wash alone.
const ITEM = "flex items-center focus-visible:-outline-offset-2";
const PRESS = "active:bg-wash-press";
// A touch row is a button: the start of its line, and its focus the
// keyboard's highlight.
const BUTTON = "text-start focus-visible:bg-wash-hover";
const GLYPH = "flex shrink-0";
const GLYPH_INK = {
	act: "text-ink-meta",
	destructive: "text-danger",
	blocked: "text-ink-disabled",
} as const;
const LABEL = "min-w-0 grow truncate";
const LABEL_BLOCKED = "truncate text-ink-disabled";
const TEXT = "flex flex-col min-w-0 grow";

// A link entry goes to a route: it is never blocked and removes nothing.
const blockedOf = (item: MenuEntry) =>
	"blocked" in item ? item.blocked : undefined;
const destructiveOf = (item: MenuEntry) =>
	"destructive" in item && item.destructive === true;

// Each item keeps its place in the list, which keys it: two items may share
// a label.
function groupsOf(items: readonly MenuEntry[]) {
	const placed = items.map((item, at) => ({ item, at }));
	return [
		{
			kind: "acts" as const,
			items: placed.filter(({ item }) => !destructiveOf(item)),
		},
		{
			kind: "destructive" as const,
			items: placed.filter(({ item }) => destructiveOf(item)),
		},
	].filter((group) => group.items.length > 0);
}

// An item's glyph, its label and, blocked, its reason under the label.
function ItemLine(props: { item: MenuEntry }) {
	const { item } = props;
	const blocked = blockedOf(item) !== undefined;
	const kind = destructiveOf(item) ? "destructive" : "act";
	return (
		<>
			{item.icon ? (
				<span className={cn(GLYPH, GLYPH_INK[blocked ? "blocked" : kind])}>
					<Icon name={item.icon} />
				</span>
			) : null}
			{blocked ? (
				<span className={TEXT}>
					<span
						className={cn(
							text({ role: "body" }),
							menuLabel({ kind }),
							LABEL_BLOCKED,
						)}
					>
						{item.label}
					</span>
					<span className={text({ role: "meta" })}>{blockedOf(item)}</span>
				</span>
			) : (
				<span
					className={cn(text({ role: "body" }), menuLabel({ kind }), LABEL)}
				>
					{item.label}
				</span>
			)}
		</>
	);
}

function rowOf(item: MenuEntry, highlighted: boolean): string {
	const blocked = blockedOf(item) !== undefined;
	return cn(
		row({ state: highlighted && !blocked ? "highlighted" : "rest" }),
		OPTION_ROW,
		ITEM,
		!blocked && PRESS,
	);
}

// The row each key moves the focus to, from the row at `at` of `count`.
const MOVES: Record<string, (at: number, count: number) => number> = {
	ArrowDown: (at, count) => (at + 1) % count,
	// From the first row or from none, ArrowUp lands on the last.
	ArrowUp: (at, count) => (at <= 0 ? count : at) - 1,
	Home: () => 0,
	End: (_, count) => count - 1,
};

// The touch sheet's rows are buttons the arrow keys, Home and End move
// through, the way a popover's rows move under Base UI.
function moveFocus(event: KeyboardEvent<HTMLElement>): void {
	const move = MOVES[event.key];
	if (!move) return;
	const rows = [
		...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
	];
	const focused = document.activeElement;
	const at = focused instanceof HTMLElement ? rows.indexOf(focused) : -1;
	event.preventDefault();
	rows[move(at, rows.length)]?.focus();
}

function Groups(props: {
	items: readonly MenuEntry[];
	item: (item: MenuEntry, at: number) => ReactNode;
}) {
	return groupsOf(props.items).map((group, index) => (
		<div
			key={group.kind}
			className={cn(
				menuGroup({ place: index === 0 ? "first" : "after" }),
				GROUP,
			)}
		>
			{group.items.map(({ item, at }) => props.item(item, at))}
		</div>
	));
}

// The more act named `label` and its acts, the touch sheet titled `title`:
// a row's menu is titled with the row's name. It holds its items' run, the
// trigger drawn pending while one runs. `painted` is the trigger while
// its data is not here: its box filled, inert, so nothing opens. Outside the
// package's exports.
export function MenuBase({
	label,
	title,
	items,
	painted,
	tabIndex,
}: {
	label: string;
	title: string;
	items: readonly MenuEntry[];
	painted?: boolean;
	/** `-1` where the trigger's host holds the tab stop (a tree's row); absent, the trigger keeps its own. */
	tabIndex?: -1;
}) {
	const touch = useTouch();
	const container = use(PortalContainer);
	useQuietGuards();
	// Each item runs under its place, so the sheet that opens is its item's.
	const acting = useAct<number>("toast");
	const pending = acting.pending !== undefined;
	const sheetOf = (at: number) => {
		const item = items[at];
		return item && "sheet" in item ? item.sheet : undefined;
	};
	const [open, setOpen] = useState(false);
	const [sheet] = useState(() => Dialog.createHandle<unknown>());
	if (touch) {
		return (
			<>
				<Dialog.Trigger
					handle={sheet}
					render={
						<IconButtonBase
							icon="Ellipsis"
							label={label}
							painted={painted}
							pending={pending}
							tabIndex={tabIndex}
						/>
					}
				/>
				<SheetLayer
					handle={sheet}
					open={open}
					onOpen={() => setOpen(true)}
					onClose={() => setOpen(false)}
				>
					<SheetHead title={title} onClose={() => setOpen(false)} />
					<div
						role="menu"
						aria-label={label}
						onKeyDown={moveFocus}
						className={cn(menu({ lines: "sheet" }), POPUP)}
					>
						<Groups
							items={items}
							item={(item, at) =>
								"href" in item ? (
									<a
										key={at}
										href={item.href}
										role="menuitem"
										onClick={(event) => {
											rememberOpener(expandedTrigger());
											setOpen(false);
											follow(event);
										}}
										className={cn(rowOf(item, false), BUTTON)}
									>
										<ItemLine item={item} />
									</a>
								) : (
									<button
										key={at}
										type="button"
										role="menuitem"
										aria-disabled={item.blocked !== undefined || undefined}
										onClick={() => {
											if (item.blocked !== undefined) return;
											rememberOpener(expandedTrigger());
											setOpen(false);
											acting.attempt(at, item);
										}}
										className={cn(rowOf(item, false), BUTTON)}
									>
										<ItemLine item={item} />
									</button>
								)
							}
						/>
					</div>
				</SheetLayer>
				<ActSheet acting={acting} of={sheetOf} />
			</>
		);
	}
	return (
		<Control.Root modal={false}>
			<Control.Trigger
				render={
					<IconButtonBase
						icon="Ellipsis"
						label={label}
						painted={painted}
						pending={pending}
						tabIndex={tabIndex}
					/>
				}
			/>
			<Control.Portal container={container}>
				<Control.Positioner
					className={POSITIONER}
					align="end"
					sideOffset={() => spacing("gap")}
				>
					<Control.Popup
						className={cn(
							POPOVER,
							menu({ lines: "popover" }),
							POPUP,
							LAYER_POPOVER,
						)}
					>
						<Groups
							items={items}
							item={(item, at) =>
								"href" in item ? (
									<Control.LinkItem
										key={at}
										label={item.label}
										href={item.href}
										// A link entry closes its menu as the touch sheet's does: the
										// route it opens may keep the menu's Pane mounted.
										closeOnClick
										onClick={(event) => {
											rememberOpener(expandedTrigger());
											follow(event);
										}}
										className={(state) => rowOf(item, state.highlighted)}
									>
										<ItemLine item={item} />
									</Control.LinkItem>
								) : (
									<Control.Item
										key={at}
										label={item.label}
										onClick={() => {
											rememberOpener(expandedTrigger());
											acting.attempt(at, item);
										}}
										disabled={item.blocked !== undefined}
										className={(state) => rowOf(item, state.highlighted)}
									>
										<ItemLine item={item} />
									</Control.Item>
								)
							}
						/>
					</Control.Popup>
				</Control.Positioner>
			</Control.Portal>
			<ActSheet acting={acting} of={sheetOf} />
		</Control.Root>
	);
}
