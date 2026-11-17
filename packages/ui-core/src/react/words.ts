import { createContext, createElement, type ReactNode, use } from "react";
import { ENGLISH, type Words } from "../tokens.ts";

// Every word a molecule draws on its own: docs/architecture/ui-core/words.md, "Words".
const WordsContext = createContext<Words>(ENGLISH);

/** Puts the consumer's words in reach of every component below it. */
export function WordsProvider(props: { words: Words; children: ReactNode }) {
	return createElement(WordsContext, { value: props.words }, props.children);
}

/** The words the provider above holds, or English. */
export function useWords(): Words {
	return use(WordsContext);
}
