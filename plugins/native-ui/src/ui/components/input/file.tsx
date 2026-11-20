import { cn } from "@slotform/ui-core/cn";
import {
	accepts,
	fileSize,
	kindsOf,
	pickerTypes,
} from "@slotform/ui-core/file";
import { FieldDisabled } from "@slotform/ui-core/react/field";
import { useTouched } from "@slotform/ui-core/react/touched";
import { useWords } from "@slotform/ui-core/react/words";
import { filled } from "@slotform/ui-core/tokens";
import {
	FIELD_ERROR_LINE,
	FIELD_PLACEHOLDER,
	FIGURES,
	field,
	fieldValue,
	text,
} from "@slotform/ui-core/variants";
import * as DocumentPicker from "expo-document-picker";
import { useContext, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { Icon } from "../../atoms/icon";
import { FieldError, useFieldName } from "../../lib/field";
import { Ink } from "../../lib/ink";
import { FadingText, flowIn } from "../../lib/motion";
import { pickedFromDocument } from "../../lib/picked";
import { Button } from "../button";
import type { FilePickProps } from "./index";

// A field box that is the act: a press anywhere in it opens the system's
// document picker, which names MIME types alone, so a type `accept` spells as
// an extension is checked on the file picked. Empty it reads Choose file,
// chosen it shows the file's name and size with an act that removes it. A file
// of another type, or a picker that fails, is refused in a line under the box and never reaches
// `onChange`; the line clears on the next pick. The phone has no drop.
// `edge-error` when its `FormField` is in error, the disabled fill when its
// field is disabled.
export function FileField({ value, onChange, accept }: FilePickProps) {
	const words = useWords();
	const { touch } = useTouched();
	const name = useFieldName();
	const error = useContext(FieldError);
	const disabled = useContext(FieldDisabled);
	// What the box refused stands in its own line until the next pick.
	const [refused, refuse] = useState<string>();
	const choose = async () => {
		let result: DocumentPicker.DocumentPickerResult;
		try {
			result = await DocumentPicker.getDocumentAsync({
				type: pickerTypes(accept),
			});
		} catch {
			refuse(words.pickFailed);
			return;
		}
		const asset = result.canceled ? undefined : result.assets[0];
		if (!asset) return;
		touch();
		const file = pickedFromDocument(asset);
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
		onChange(file);
	};
	const ink = disabled ? "ink-disabled" : "ink-meta";
	return (
		<View className="gap-gap">
			<Pressable
				accessible={false}
				disabled={disabled}
				onPress={choose}
				className={cn(
					field({
						trailing: value ? "act" : "none",
						state: error || refused ? "error" : "rest",
					}),
					"flex-row items-center",
					disabled && "bg-fill-disabled",
				)}
			>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={name}
					accessibilityState={{ disabled }}
					disabled={disabled}
					onPress={choose}
					className="flex-1 flex-row items-center gap-gap min-w-0"
				>
					<Ink.Provider value={ink}>
						<Icon name={value ? "File" : "FileUp"} fit="control" />
					</Ink.Provider>
					<RNText
						numberOfLines={1}
						// A name cuts in its middle, its extension kept, as a file row's does.
						ellipsizeMode={value ? "middle" : "tail"}
						className={cn(
							fieldValue({ kind: "text" }),
							!value && FIELD_PLACEHOLDER,
							"flex-1",
							disabled && "text-ink-disabled",
						)}
					>
						{value ? value.name : words.chooseFile}
					</RNText>
					{value ? (
						<RNText
							className={cn(
								text({ role: "meta" }),
								FIGURES,
								"shrink-0",
								disabled && "text-ink-disabled",
							)}
						>
							{fileSize(value.size)}
						</RNText>
					) : null}
				</Pressable>
				{value ? (
					<Button
						glyph
						icon="X"
						label={`${words.remove} ${value.name}`}
						onAct={() => {
							touch();
							refuse(undefined);
							onChange(null);
						}}
						fit="field"
					/>
				) : null}
			</Pressable>
			{refused ? (
				<FadingText
					key={refused}
					entering={flowIn()}
					accessibilityRole="alert"
					className={FIELD_ERROR_LINE}
				>
					{refused}
				</FadingText>
			) : null}
		</View>
	);
}
