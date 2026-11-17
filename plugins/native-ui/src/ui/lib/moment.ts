import { momentWords } from "@fcalell/ui-core/format";

// An ISO moment as a reader reads it, in the device's language (`momentWords`): docs/architecture/ui-core/words.md, "On the phone".
export function moment(iso: string, now = new Date()): string {
	return momentWords(iso, now);
}
