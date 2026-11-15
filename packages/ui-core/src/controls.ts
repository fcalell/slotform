// What a control derives from its value: a text area's word count and a checkbox's state name; both platforms' controls draw from it.

export function wordCount(value: string): number {
	return value.split(/\s+/).filter(Boolean).length;
}

export const STATES = {
	true: "checked",
	false: "unchecked",
	mixed: "mixed",
} as const;
