import type { IconName } from "@slotform/ui-core/descriptors";
import { BADGE_RING, BADGE_RING_CENTRE } from "@slotform/ui-core/variants";
import { View } from "react-native";
import { Ink } from "../../lib/ink";
import { IconBase } from "../icon";

// The required ring, outlined with its centre filled: a badge's glyph and a
// row's end mark. Outside the package's exports.
export function RequiredRing() {
	return (
		<View className={BADGE_RING}>
			<View className={BADGE_RING_CENTRE} />
		</View>
	);
}

// A glyph in the meta ink at the meta text's size (a lock, a flag): a badge's
// glyph, a row's end mark and a table's lock. Outside the package's exports.
export function MetaGlyph({ name }: { name: IconName }) {
	return (
		<Ink.Provider value="ink-meta">
			<IconBase name={name} fit="meta" stroke="line" />
		</Ink.Provider>
	);
}
