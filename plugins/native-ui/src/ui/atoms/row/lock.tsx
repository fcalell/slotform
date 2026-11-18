import { useWords } from "@fcalell/ui-core/react/words";
import { LOCK_GLYPH } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { MetaGlyph } from "./glyphs";

// A table's lock: the meta glyph named `Locked`, after a cell its row locks and
// in a column head whose column is read only. A row's lock is a badge of its
// facts line (`FactBadge`), its glyph and its reason. Inert. Outside the
// package's exports.
export function LockMark() {
	const words = useWords();
	return (
		<View
			pointerEvents="none"
			accessible
			accessibilityLabel={words.locked}
			className={LOCK_GLYPH}
		>
			<MetaGlyph name="Lock" />
		</View>
	);
}
