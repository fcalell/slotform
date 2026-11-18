import { momentWords } from "@fcalell/ui-core/format";
import { pageLang } from "./lang.ts";

// An ISO moment as a reader reads it, in the document's language
// (`momentWords`): the time alone today, the day's word and the time a day
// either side, the date and time, its year only when it is not this year's.
export function moment(
	iso: string,
	now = new Date(),
	lang = pageLang(),
): string {
	return momentWords(iso, now, lang);
}
