import { formatterFor } from "@fcalell/ui-core/format";

const STEPS = [
	[1e9, "B"],
	[1e6, "M"],
	[1e3, "K"],
] as const;

// A figure in short notation ("55K"): docs/architecture/ui-core/words.md, "On the phone".
// TODO: Hermes on iOS lacks `notation: "compact"`; use Intl's compact notation as the web does once it ships.
export function compact(value: number): string {
	const mantissa = formatterFor("number", undefined, {
		maximumFractionDigits: 1,
	});
	const size = Math.abs(value);
	const step = STEPS.find(
		([step]) => size >= step || Math.round((size / step) * 10_000) >= 10_000,
	);
	return step
		? `${mantissa.format(value / step[0])}${step[1]}`
		: mantissa.format(value);
}
