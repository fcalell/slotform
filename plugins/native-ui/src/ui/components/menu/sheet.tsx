import { cn } from "@slotform/ui-core/cn";
import type { Act } from "@slotform/ui-core/descriptors";
import {
	menu,
	menuGroup,
	menuLabel,
	OPTION_ROW,
	row,
	text,
} from "@slotform/ui-core/variants";
import { Pressable, Text as RNText, View } from "react-native";
import { Icon } from "../../atoms/icon";
import { Ink } from "../../lib/ink";
import { SheetHead } from "../sheet/head";
import { SheetLayer } from "../sheet/layer";

const ROW = "flex-row items-center";
const PRESS = "active:bg-wash-press";
const LABEL = "min-w-0 flex-1";
const LABEL_BLOCKED = "text-ink-disabled";
const TEXT = "min-w-0 flex-1";
const GLYPH_INK = {
	act: "ink-meta",
	destructive: "danger",
	blocked: "ink-disabled",
} as const;

// The acts in order, then the destructive ones under a hairline.
function groupsOf(items: readonly Act[]) {
	return [
		{ kind: "acts" as const, items: items.filter((item) => !item.destructive) },
		{
			kind: "destructive" as const,
			items: items.filter((item) => item.destructive),
		},
	].filter((group) => group.items.length > 0);
}

// One act of a menu sheet: its glyph in the meta ink (danger for a
// destructive act), its label, and, blocked, its label faded over its reason,
// the row inert.
function MenuRow({ item, onAct }: { item: Act; onAct: () => void }) {
	const blocked = item.blocked !== undefined;
	const kind = item.destructive ? "destructive" : "act";
	const label = cn(text({ role: "body" }), menuLabel({ kind }));
	return (
		<Pressable
			accessibilityRole="menuitem"
			accessibilityState={{ disabled: blocked }}
			disabled={blocked}
			onPress={onAct}
			className={cn(row({ state: "rest" }), OPTION_ROW, ROW, !blocked && PRESS)}
		>
			{item.icon ? (
				<Ink.Provider value={GLYPH_INK[blocked ? "blocked" : kind]}>
					<Icon name={item.icon} />
				</Ink.Provider>
			) : null}
			{blocked ? (
				<View className={TEXT}>
					<RNText numberOfLines={1} className={cn(label, LABEL_BLOCKED)}>
						{item.label}
					</RNText>
					<RNText className={text({ role: "meta" })}>{item.blocked}</RNText>
				</View>
			) : (
				<RNText numberOfLines={1} className={cn(label, LABEL)}>
					{item.label}
				</RNText>
			)}
		</Pressable>
	);
}

// A menu on the phone: a sheet titled `title` with its close act, its rows
// under the head, the destructive acts last under a hairline between the
// groups; taking an act closes the sheet first. Outside the package's exports: a
// `MenuBase` opens it from its more act, a `MessageInput` from its attach act.
export function MenuSheet({
	label,
	title,
	items,
	open,
	onClose,
}: {
	label: string;
	title: string;
	items: readonly Act[];
	open: boolean;
	onClose: () => void;
}) {
	return (
		<SheetLayer
			open={open}
			onClose={onClose}
			title={title}
			head={<SheetHead title={title} onClose={onClose} />}
		>
			<View
				accessibilityRole="menu"
				accessibilityLabel={label}
				className={menu({ lines: "sheet" })}
			>
				{groupsOf(items).map((group, index) => (
					<View
						key={group.kind}
						className={menuGroup({ place: index === 0 ? "first" : "after" })}
					>
						{group.items.map((item) => (
							<MenuRow
								key={item.label}
								item={item}
								onAct={() => {
									onClose();
									item.onAct();
								}}
							/>
						))}
					</View>
				))}
			</View>
		</SheetLayer>
	);
}
