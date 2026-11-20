import { cn } from "@slotform/ui-core/cn";
import { useArrivals } from "@slotform/ui-core/react/arrive";
import { CARD } from "@slotform/ui-core/variants";
import type { ReactNode } from "react";
import { View } from "react-native";
import { between } from "../../lib/group";
import { blockIn, FadingView } from "../../lib/motion";

// The card's clip rounds the rows' outer corners.
const BOX = "overflow-hidden";

/** The hairline card every Section's rows stand on; the rows pad themselves with its inset. Outside the package's exports. */
export function SheetCard(props: { className?: string; children: ReactNode }) {
	return (
		<View className={cn(CARD, BOX, props.className)}>{props.children}</View>
	);
}

/** A card of entries the owner draws itself (a Rules' cards, a Table's facts), the hairline once between them; an entry that came on its own once the card was drawn is a block that fades in as it mounts. Outside the package's exports. */
export function SheetEntries(props: {
	entries: readonly { key: string; node: ReactNode }[];
}) {
	const arrived = useArrivals(
		props.entries.map((entry) => entry.key),
		true,
	);
	return (
		<SheetCard>
			{props.entries.map((entry, index) => (
				<FadingView
					key={entry.key}
					entering={arrived.has(entry.key) ? blockIn() : undefined}
					className={between(index)}
				>
					{entry.node}
				</FadingView>
			))}
		</SheetCard>
	);
}
