import { cn } from "@fcalell/ui-core/cn";
import type {
	GroupSpec,
	IconName,
	OptionPick,
	PlaceSpec,
} from "@fcalell/ui-core/descriptors";
import { ShellHome } from "@fcalell/ui-core/react/frame";
import { useWords } from "@fcalell/ui-core/react/words";
import { placeTrail, trailEnds } from "@fcalell/ui-core/route";
import { tabCount } from "@fcalell/ui-core/tokens";
import {
	type ContentTone,
	type PlaceTabState,
	placeTab,
	placeTabContentTone,
	placeTabLabel,
	SHELL_BANNER,
	SHELL_COLUMN,
	SHELL_TAB_BAR,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useMemo, useState } from "react";
import { Text as RNText, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../atoms/icon";
import type { Closed } from "../../lib/closed";
import {
	PlaceName,
	PlaceTrail,
	ShellSwitcher,
	ShellTabs,
} from "../../lib/container";
import { Ink } from "../../lib/ink";
import { isRoute, navigate, usePathname } from "../../lib/navigate";
import { Press } from "../../lib/press";
import { Count } from "../count";
import { Pane } from "../pane";
import { Section } from "../section";
import { ContainerHost } from "./host";
import { Panes } from "./panes";
import { SwitcherPick } from "./switcher";

const BOX = "flex-1 overflow-hidden";
const CONTENT = "flex-1";

const TABS = "flex-row";
const TAB = "flex-col-reverse items-center justify-center min-w-0 flex-1";
const TAB_GLYPH = "relative";
const TAB_COUNT = "absolute -top-gap left-full -ms-hairline";
const TAB_LABEL = "max-w-full";
// A tab bar holds five tabs at most: past five places, four and More.
const TAB_SPACE = 5;

// The places the tab bar draws as tabs, and the rest, which the More page holds.
// A spot place (`#activity`) is no page, so it is no tab: expo-router serves no hash.
function tabsOf(places: readonly PlaceSpec[]) {
	const pages = places.filter((spec) => isRoute(spec.route));
	if (pages.length <= TAB_SPACE) return { shown: pages, rest: [] };
	return {
		shown: pages.slice(0, TAB_SPACE - 1),
		rest: pages.slice(TAB_SPACE - 1),
	};
}

// The tab's glyph ink is its cell's content tone: the label repeats it, since
// a native Text inherits none.
const TAB_INK: Record<PlaceTabState, ContentTone> = {
	idle: placeTabContentTone("idle"),
	selected: placeTabContentTone("selected"),
};

export interface ShellProps extends Closed {
	/** The tab bar's places, in order; the one at the current route is selected. Past five, four stand and a More tab opens a page of the rest. A spot place (`#activity`) draws no tab. */
	places: readonly PlaceSpec[];
	/** The groups the places name, for the ones that carry a switcher: the More page draws a group's switcher over its places. */
	groups?: readonly GroupSpec[];
	/** A `Banner` under the status bar, at the page inset. */
	banner?: ReactNode;
	/** What the app is looking at, and what it can switch to; its trigger starts the bar of each `Pane` that has no back act. */
	switcher?: OptionPick;
	/** A part that stands above the tab bar under every screen (a `Dock`), whatever the route; without one the Shell draws nothing there. */
	foot?: ReactNode;
	/** The router's stack: the screens, each a `Pane`. */
	children?: ReactNode;
}

// The frame on the column's ground: docs/architecture/ui-core/layout.md, "On the phone".
export function Shell({
	places,
	groups,
	banner,
	switcher,
	foot,
	children,
}: ShellProps) {
	const insets = useSafeAreaInsets();
	const pathname = usePathname();
	// The More page stands at the route it opened on: going to a place closes it.
	const [moreAt, setMoreAt] = useState<string>();
	const more = moreAt === pathname;
	// The tab is the top of the trail: a route under a branch selects its tab.
	const trail = placeTrail(places, pathname);
	const route = trail[0]?.route;
	const words = useWords();
	const name = more ? words.more : trailEnds(trail).here?.label;
	const split = useMemo(() => tabsOf(places), [places]);
	// A place that is a spot on its page (`#activity`) leads nowhere from an
	// address nothing serves, so home is the first place that is a route.
	const first = places.find((spec) => isRoute(spec.route));
	const home = first && { label: first.label, href: first.route };
	// The tab bar each Panes draws changes only with the places, the route and
	// the More page, so a Shell state change re-renders no Panes.
	const tabs = useMemo(
		() => (
			<>
				{foot}
				<TabBar
					{...split}
					route={route}
					more={more}
					onMore={() => setMoreAt(pathname)}
					onPlace={() => setMoreAt(undefined)}
				/>
			</>
		),
		[split, route, pathname, more, foot],
	);
	return (
		<ContainerHost>
			<View
				style={{ paddingTop: insets.top }}
				className={cn(SHELL_COLUMN, BOX)}
			>
				{banner ? <View className={SHELL_BANNER}>{banner}</View> : null}
				<View className={CONTENT}>
					<ShellHome.Provider value={home}>
						<ShellSwitcher.Provider value={switcher}>
							<ShellTabs.Provider value={tabs}>
								<PlaceTrail.Provider value={trail}>
									<PlaceName.Provider value={name}>
										<Panes>
											{more ? (
												<MorePage places={split.rest} groups={groups} />
											) : (
												children
											)}
										</Panes>
									</PlaceName.Provider>
								</PlaceTrail.Provider>
							</ShellTabs.Provider>
						</ShellSwitcher.Provider>
					</ShellHome.Provider>
				</View>
			</View>
		</ContainerHost>
	);
}

// The places past the tab bar, a page of rows: each place's glyph leading,
// its count trailing, its route where the row goes; a group with a switcher
// among them draws the switcher's row before the rows.
function MorePage({
	places,
	groups,
}: {
	places: readonly PlaceSpec[];
	groups: readonly GroupSpec[] | undefined;
}) {
	const switchers = (groups ?? []).filter(
		(group) =>
			group.switcher && places.some((spec) => spec.group === group.label),
	);
	return (
		<Pane>
			{switchers.map((group) =>
				group.switcher ? (
					<SwitcherPick key={group.label} switcher={group.switcher} />
				) : null,
			)}
			<Section
				items={places.map((spec) => ({
					key: spec.route,
					leading: { icon: spec.icon },
					title: spec.label,
					trailing:
						spec.count === undefined ? undefined : { count: spec.count },
					href: spec.route,
				}))}
			/>
		</Pane>
	);
}

// The places: glyph over label, the count a badge on the glyph's top-right
// corner, its start at the glyph box's edge, on the bar's ground; then, with
// places past the tabs, the More tab, selected while its page stands or the
// current place is among the rest.
// A tab holds its label ahead of its glyph and stacks them reversed, and
// takes no label of its own, so it reads the label then the count.
function TabBar({
	shown,
	rest,
	route,
	more,
	onMore,
	onPlace,
}: {
	shown: readonly PlaceSpec[];
	rest: readonly PlaceSpec[];
	route: string | undefined;
	more: boolean;
	onMore: () => void;
	onPlace: () => void;
}) {
	const insets = useSafeAreaInsets();
	const words = useWords();
	return (
		<View
			role="navigation"
			accessibilityLabel={words.places}
			style={{ paddingBottom: insets.bottom }}
			className={cn(SHELL_TAB_BAR, TABS)}
		>
			{shown.map((spec) => (
				<Tab
					key={spec.route}
					icon={spec.icon}
					label={spec.label}
					count={
						spec.count === undefined ? undefined : tabCount(words, spec.count)
					}
					selected={!more && spec.route === route}
					onAct={() => {
						onPlace();
						navigate(spec.route);
					}}
				/>
			))}
			{rest.length > 0 ? (
				<Tab
					icon="Ellipsis"
					label={words.more}
					selected={more || rest.some((spec) => spec.route === route)}
					onAct={onMore}
				/>
			) : null}
		</View>
	);
}

function Tab({
	icon,
	label,
	count,
	selected,
	onAct,
}: {
	icon: IconName;
	label: string;
	count?: string;
	selected: boolean;
	onAct: () => void;
}) {
	const state = selected ? "selected" : "idle";
	return (
		<Press
			accessibilityRole="link"
			accessibilityState={{ selected }}
			onPress={onAct}
			wash="rounded-row bg-wash-press"
			give
			className={cn(placeTab({ state }), TAB)}
		>
			<RNText
				numberOfLines={1}
				className={cn(placeTabLabel({ state }), TAB_LABEL)}
			>
				{label}
			</RNText>
			<View className={TAB_GLYPH}>
				<Ink.Provider value={TAB_INK[state]}>
					<Icon name={icon} fit="control" />
				</Ink.Provider>
				{count === undefined ? null : (
					<View className={TAB_COUNT}>
						<Count value={count} />
					</View>
				)}
			</View>
		</Press>
	);
}
