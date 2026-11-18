// The day `index` days after Sep 3, "Sep 3": the first of a fixture's 30 days.
export const dayAfter = (index: number) =>
	new Date(Date.UTC(2026, 8, 3 + index)).toLocaleDateString("en", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
