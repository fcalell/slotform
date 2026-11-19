import { cn } from "@fcalell/ui-core/cn";
import type { IconLinkAct, Option } from "@fcalell/ui-core/descriptors";
import {
	optionBlocked,
	optionLeading,
	optionMeta,
} from "@fcalell/ui-core/list-state";
import {
	type Grouped,
	groupsOf,
	type OptionRow,
	optionRows,
	type PickOptions,
	SEARCH_PAST,
} from "@fcalell/ui-core/pick";
import { useWords } from "@fcalell/ui-core/react/words";
import {
	HAIRLINE,
	OPTION_GROUP_LABEL,
	OPTION_ROW,
	PICKER_EMPTY,
	ROW_LEADING,
	row,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { useBottomSheetScrollableCreator } from "@gorhom/bottom-sheet";
import { Fragment, useMemo, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { Icon } from "../../atoms/icon";
import { StatusDot } from "../../atoms/status/dot";
import type { IconAct } from "../../lib/act";
import { asIconAct, useAct } from "../../lib/act";
import { List } from "../../lib/hosts";
import { Ink } from "../../lib/ink";
import { Avatar } from "../avatar";
import { Chip } from "../chip";
import { Input } from "../input";
import { SheetHead } from "../sheet/head";
import { SheetLayer } from "../sheet/layer";

// The rows stand a pair under the head, and under the search fixed above
// them, which stands a pair under the head.
const ROWS = "pt-gap pb-pad";
const SEARCH_REGION = "px-pad pt-gap";
const OPTION = "flex-row items-center";
const PRESS = "active:bg-wash-press";
// A blocked option's label and reason.
const BLOCKED_INK = "text-ink-disabled";
const OPTION_TEXT = "flex-1 min-w-0";
const TICK = "shrink-0";
// A glyph leads an option in the row's leading region.
const LEADING = "shrink-0 items-center justify-center";
// An option's own chip, centred on the label's line (a chip hugs the top of its row).
const KIND = "shrink-0 self-center";
// The act that ends the list stands under a hairline across it, a float
// inset below the line.
const ACT_REGION = "border-t pt-gap";
const ACT_GLYPH = "shrink-0";
// A row's key: its option's value, or its group's label.
const keyOf = <V extends string | null>(entry: OptionRow<V>) =>
	"option" in entry
		? `option:${String(entry.option.value)}`
		: `label:${entry.label}`;
// What a search that matches nothing says, on a row of the sheet.
const NO_MATCHES = "py-gap";

// Options under their groups and flat, derived once per options identity and
// shared by a trigger and its sheet.
interface OptionGroups<V extends string | null> {
	groups: readonly Grouped<V>[];
	flat: readonly Option<V>[];
}

// What a waiting pick draws its rows from: one array, so the groups memoize.
export const NO_OPTIONS: PickOptions<never> = [];

export function useOptionGroups<V extends string | null>(
	options: PickOptions<V>,
): OptionGroups<V> {
	return useMemo(() => {
		const groups = groupsOf(options);
		return { groups, flat: groups.flatMap((group) => group.options) };
	}, [options]);
}

// An option's label (the empty choice in the placeholder's ink) over its
// description; an option carrying a glyph leads with it, one carrying a state
// with its status's dot, one carrying an avatar with its avatar, and its chip
// after the text.
function OptionText({
	option,
	chosen,
}: {
	option: Option<string | null>;
	chosen: boolean;
}) {
	const blocked = optionBlocked(option, chosen);
	const meta = optionMeta(option, chosen);
	const lead = optionLeading(option);
	return (
		<>
			{lead.icon ? (
				<View className={cn(ROW_LEADING, LEADING)}>
					<Ink.Provider value="ink-meta">
						<Icon name={lead.icon} />
					</Ink.Provider>
				</View>
			) : null}
			{lead.tone ? <StatusDot tone={lead.tone} /> : null}
			{lead.avatar ? (
				<Avatar name={lead.avatar.name} src={lead.avatar.src} />
			) : null}
			<View className={OPTION_TEXT}>
				<RNText
					numberOfLines={1}
					className={cn(
						text({ role: "body" }),
						option.value === null && PICKER_EMPTY,
						blocked !== undefined && BLOCKED_INK,
					)}
				>
					{option.label}
				</RNText>
				{meta ? (
					<RNText
						numberOfLines={1}
						className={cn(
							text({ role: "meta" }),
							blocked !== undefined && BLOCKED_INK,
						)}
					>
						{meta}
					</RNText>
				) : null}
			</View>
			{option.chip ? (
				<View className={KIND}>
					<Chip {...option.chip} />
				</View>
			) : null}
		</>
	);
}

// The sheet a `Picker` opens: a menu sheet titled `title`, its
// rows edge to edge at the card's inset under their group labels, the chosen
// one ticked, a search leading them past `SEARCH_PAST` options (the sheet then stands
// full height, the search in its head) and an act (the act
// that makes a new option) under a hairline after them; a pick or the act
// closes it.
// A `chosen` set makes it a pick of several: the options in it are ticked and a
// pick toggles one without closing the sheet. Outside the package's exports.
export function PickSheet<V extends string | null>({
	title,
	groups: { groups, flat },
	value,
	chosen: set,
	onChange,
	open,
	onClose,
	act,
}: {
	title: string;
	groups: OptionGroups<V>;
	value: V | undefined;
	chosen?: readonly V[];
	onChange: (value: V) => void;
	open: boolean;
	onClose: () => void;
	act?: IconAct | IconLinkAct;
}) {
	const words = useWords();
	// The act holds its own attempt past the sheet's close: a rejection toasts with Retry.
	const acting = useAct("toast");
	const [search, setSearch] = useState("");
	// The search clears as the sheet opens, during render, so the rows keep
	// their filter while the sheet leaves.
	const [wasOpen, setWasOpen] = useState(open);
	if (wasOpen !== open) {
		setWasOpen(open);
		if (open) setSearch("");
	}
	const searching = flat.length > SEARCH_PAST;
	const typed = search.trim().toLowerCase();
	// The filter runs only on a search, once per search and options.
	const shown = useMemo(
		() =>
			typed === ""
				? groups
				: groups.map((group) => ({
						...group,
						options: group.options.filter((option) =>
							option.label.toLowerCase().includes(typed),
						),
					})),
		[groups, typed],
	);
	// The options under their group labels, one row each; a searching sheet
	// windows them in its own scroll, which drags the sheet as its body would.
	const rows = optionRows(shown);
	const scroll = useBottomSheetScrollableCreator();
	const rowOf = (entry: OptionRow<V>) => {
		if (!("option" in entry))
			return (
				<RNText
					accessibilityRole="header"
					className={cn(
						OPTION_GROUP_LABEL,
						text({ role: "meta" }),
						textStrong({ role: "meta" }),
					)}
				>
					{entry.label}
				</RNText>
			);
		const { option } = entry;
		const chosen = set ? set.includes(option.value) : option.value === value;
		const blocked = optionBlocked(option, chosen);
		return (
			<Pressable
				accessibilityRole={set ? "checkbox" : "radio"}
				accessibilityLabel={option.label}
				accessibilityState={{
					checked: chosen,
					disabled: blocked !== undefined,
				}}
				disabled={blocked !== undefined}
				onPress={() => {
					if (!set) onClose();
					onChange(option.value);
				}}
				className={cn(
					row(),
					OPTION_ROW,
					OPTION,
					blocked === undefined && PRESS,
				)}
			>
				<OptionText option={option} chosen={chosen} />
				{chosen ? (
					<View className={TICK}>
						<Ink.Provider value="ink-body">
							<Icon name="Check" fit="body" />
						</Ink.Provider>
					</View>
				) : null}
			</Pressable>
		);
	};
	const none = (
		<RNText
			className={cn(row(), OPTION_ROW, text({ role: "meta" }), NO_MATCHES)}
		>
			{words.noMatches}
		</RNText>
	);
	const foot = act ? (
		<View className={cn(HAIRLINE, ACT_REGION)}>
			<Pressable
				accessibilityRole={"href" in act ? "link" : "button"}
				accessibilityState={{ disabled: act.blocked !== undefined }}
				disabled={act.blocked !== undefined}
				onPress={() => {
					onClose();
					acting.attempt(true, asIconAct(act));
				}}
				className={cn(
					row(),
					OPTION_ROW,
					OPTION,
					act.blocked === undefined && PRESS,
				)}
			>
				<View className={ACT_GLYPH}>
					<Ink.Provider value="ink-meta">
						<Icon name={act.icon} />
					</Ink.Provider>
				</View>
				<RNText
					numberOfLines={1}
					className={cn(text({ role: "body" }), OPTION_TEXT)}
				>
					{act.label}
				</RNText>
			</Pressable>
		</View>
	) : null;
	return (
		<SheetLayer
			open={open}
			onClose={onClose}
			title={title}
			tall={searching}
			head={
				<SheetHead
					title={title}
					onClose={onClose}
					above={
						searching ? (
							<View className={SEARCH_REGION}>
								<Input
									label={words.search}
									kind="search"
									value={search}
									onChange={setSearch}
								/>
							</View>
						) : undefined
					}
				/>
			}
		>
			{searching ? (
				<List
					data={rows}
					keyExtractor={keyOf}
					getItemType={(entry) => ("option" in entry ? "option" : "label")}
					renderItem={({ item }) => rowOf(item)}
					ListEmptyComponent={none}
					ListFooterComponent={foot}
					renderScrollComponent={scroll}
					accessibilityLabel={title}
					contentContainerClassName={ROWS}
				/>
			) : (
				<View accessibilityLabel={title} className={ROWS}>
					{rows.map((entry) => (
						<Fragment key={keyOf(entry)}>{rowOf(entry)}</Fragment>
					))}
					{rows.length === 0 ? none : null}
					{foot}
				</View>
			)}
		</SheetLayer>
	);
}
