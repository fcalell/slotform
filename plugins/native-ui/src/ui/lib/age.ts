import { ageWords, ageShort as shortOf } from "@slotform/ui-core/clock";
import { formatterFor, momentWords } from "@slotform/ui-core/format";

// An ISO moment as its age from `now`, through the platform's relative-time words.
// Hermes fallbacks: docs/architecture/ui-core/words.md, "On the phone".
// TODO: Hermes ships no `Intl.RelativeTimeFormat`; an age reads as a moment until it does.
export function age(moment: string, now = Date.now()): string {
	if (Number.isNaN(Date.parse(moment))) return moment;
	if (typeof Intl.RelativeTimeFormat !== "function")
		return momentWords(moment, new Date(now));
	const format = formatterFor("relative", undefined, { numeric: "auto" });
	return ageWords(moment, now, format);
}

// Whether `Intl.NumberFormat` words a unit ("2 min"): docs/architecture/ui-core/words.md, "On the phone".
function wordsUnits(): boolean {
	try {
		return (
			formatterFor("number", undefined, {
				style: "unit",
				unit: "minute",
			}).resolvedOptions().style === "unit"
		);
	} catch {
		return false;
	}
}

const UNITS_WORDED = wordsUnits();

// An ISO moment as its short age ("2 min", "16 sec"): docs/architecture/ui-core/words.md, "On the phone".
// TODO: Hermes' `Intl.NumberFormat` `unit` style is unverified on a device; verify it there, then drop the fallback.
export function ageShort(moment: string, now = Date.now()): string {
	if (!UNITS_WORDED || typeof Intl.RelativeTimeFormat !== "function")
		return age(moment, now);
	return shortOf(
		moment,
		now,
		(unit) =>
			formatterFor("number", undefined, {
				style: "unit",
				unit,
				unitDisplay: "short",
			}),
		formatterFor("relative", undefined, { numeric: "auto" }),
	);
}
