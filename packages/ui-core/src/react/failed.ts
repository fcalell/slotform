import type { Words } from "../tokens.ts";
import type { ReadPort } from "./port.ts";

// The sentence a failed act or save draws: the server's refusal, else the generic one.
export function failedSentence(
	port: ReadPort,
	words: Words,
	error: unknown,
): string {
	return port.refusal(error) ?? words.actFailed;
}
