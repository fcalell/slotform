import { cn } from "@slotform/ui-core/cn";
import type { ChangeKind } from "@slotform/ui-core/descriptors";
import { CHANGE_GLYPH } from "@slotform/ui-core/list-state";
import { useWords } from "@slotform/ui-core/react/words";
import { changeMark } from "@slotform/ui-core/variants";
import { Named } from "../button/glyph.tsx";
import { IconBase } from "../icon/index.tsx";

const BOX = "flex shrink-0 items-center justify-center";
// The glyph names its kind on hover, standing above a row's hit; on touch it
// stays passive and a press reaches the row.
const NAMED = "relative pointer-events-auto touch:pointer-events-none";

/** Where a row, a fact or a field stands in a change set: its kind's glyph in the kind's ink in a lane one icon wide, named by the kind's word (its accessible name and tooltip). A change set marks every row, its untouched ones `unchanged`, so the names line up. Outside the package's exports. */
export function ChangeMark(props: { kind: ChangeKind }) {
	const { kind } = props;
	const words = useWords();
	return (
		<Named label={words[kind]}>
			<span
				role="img"
				aria-label={words[kind]}
				className={cn(changeMark({ kind }), BOX, NAMED)}
			>
				<IconBase name={CHANGE_GLYPH[kind]} fit="meta" stroke="mark" />
			</span>
		</Named>
	);
}
