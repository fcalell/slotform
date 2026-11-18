import { Input as Control } from "@base-ui/react/input";
import { cn } from "@fcalell/ui-core/cn";
import { accepts, fileSize, kindsOf } from "@fcalell/ui-core/file";
import { pathCut } from "@fcalell/ui-core/list-state";
import { FieldDisabled } from "@fcalell/ui-core/react/field";
import { useWords } from "@fcalell/ui-core/react/words";
import { filled } from "@fcalell/ui-core/tokens";
import {
	FIELD_GLYPH,
	FIELD_PLACEHOLDER,
	FIGURES,
	field,
	fieldValue,
	text,
	YIELDS_FIRST,
} from "@fcalell/ui-core/variants";
import { type ChangeEvent, useState } from "react";
import { Icon } from "../../atoms/icon/index.tsx";
import { BOX_FOCUS, useModality } from "../../lib/modality.ts";
import { pickedFrom } from "../../lib/picked.ts";
import { Button } from "../button/index.tsx";
import { BOX, BOX_DISABLED, BOX_HOVER_VALUE } from "./base.tsx";
import { chosenFiles, fileDrop } from "./drop.ts";
import type { FilePickProps } from "./index.tsx";
import { useRefusal } from "./refusal.tsx";

// The native file input lies over the whole box, unseen: a press anywhere
// opens the system dialog and the keyboard reaches it, so the box rings on its
// focus as an `Input`'s does. The remove act stands above it.
const PICK = "absolute inset-0 opacity-0";
const ANCHOR = "relative";
const STACK = "flex flex-col gap-gap min-w-0";
const ABOVE = "relative flex";
const VALUE = "min-w-0 grow truncate";
// A chosen name cuts in its middle as a file row's does (`pathCut`): its stem
// truncates and its end, the extension and the characters before it, stands
// whole while the box holds it: the stem gives first (a shrink weight past the
// end's), and the end gives only once the stem is gone, cut with an ellipsis,
// so the box never outgrows its column.
const NAME = "flex min-w-0 grow";
const STEM = `min-w-0 truncate ${YIELDS_FIRST}`;
const END = "min-w-0 truncate";
const SIZE = "shrink-0 max-w-measure-short truncate";
const DISABLED = "text-ink-disabled";
// A file over the box draws the focus ring, the box being where it lands.
const OVER = "outline-2 outline-offset-(--focus-ring-edge-offset) outline-ring";

function Name(props: { name: string }) {
	const { stem, tail } = pathCut(props.name);
	return (
		<>
			<span className={STEM}>{stem}</span>
			<span className={END}>{tail}</span>
		</>
	);
}

/** The field box a `file` Input draws. Outside the package's exports. */
export function FileField({ value, onChange, accept }: FilePickProps) {
	useModality();
	const words = useWords();
	const { refused, refuse, wired, line } = useRefusal();
	const [over, setOver] = useState(false);
	const take = (file: File | undefined) => {
		if (!file) return;
		if (!accepts(file, accept)) {
			refuse(
				filled(words.wrongType, {
					name: file.name,
					types: kindsOf(accept, words).join(", "),
				}),
			);
			return;
		}
		refuse(undefined);
		onChange(pickedFrom(file));
	};
	const pick = (event: ChangeEvent<HTMLInputElement>) =>
		take(chosenFiles(event)[0]);
	const drops = (disabled: boolean) =>
		fileDrop(setOver, disabled ? undefined : (files) => take(files[0]));
	return (
		<div className={STACK}>
			<Control
				type="file"
				accept={accept.join(",")}
				onChange={pick}
				// Base UI's Field wires the control: docs/architecture/plugins/react-ui.md, "Field box and focus rings".
				render={(control, state) => (
					<div
						aria-disabled={state.disabled || undefined}
						{...drops(state.disabled)}
						className={cn(
							field({
								trailing: value ? "act" : "none",
								state: state.valid === false || refused ? "error" : "rest",
							}),
							FIELD_GLYPH,
							BOX,
							BOX_FOCUS,
							ANCHOR,
							over && OVER,
							state.disabled
								? BOX_DISABLED
								: state.valid !== false && !refused && BOX_HOVER_VALUE,
						)}
					>
						<input {...control} {...wired(control)} className={PICK} />
						<Icon name={value ? "File" : "FileUp"} fit="control" />
						<span
							className={cn(
								fieldValue({ kind: "text" }),
								!value && FIELD_PLACEHOLDER,
								value ? NAME : VALUE,
								state.disabled && DISABLED,
							)}
						>
							{value ? <Name name={value.name} /> : words.chooseFile}
						</span>
						{value ? (
							<>
								<span
									className={cn(
										text({ role: "meta" }),
										FIGURES,
										SIZE,
										state.disabled && DISABLED,
									)}
								>
									{fileSize(value.size)}
								</span>
								<span className={ABOVE}>
									<FieldDisabled value={state.disabled}>
										<Button
											glyph
											icon="X"
											label={`${words.remove} ${value.name}`}
											onAct={() => {
												refuse(undefined);
												onChange(null);
											}}
											fit="field"
										/>
									</FieldDisabled>
								</span>
							</>
						) : null}
					</div>
				)}
			/>
			{line}
		</div>
	);
}
