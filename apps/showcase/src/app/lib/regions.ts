import type { AppRouter } from "../../../.stack/worker";

type Region = AppRouter["settings"]["general"]["__output"]["region"];

// The words for each region the server names by its code.
export const REGION_LABELS = {
	fra: "Frankfurt, eu-central-1",
	iad: "Washington, us-east-1",
	sin: "Singapore, ap-southeast-1",
} as const satisfies Record<Region, string>;

// The regions as a pick's options, in the order above.
export const REGIONS = Object.entries(REGION_LABELS).map(([value, label]) => ({
	// `Object.entries` widens a record's keys to `string`; these are its `Region` keys.
	value: value as Region,
	label,
}));
