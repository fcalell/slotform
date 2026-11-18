// A text as a part of a file name: `Invite people` is `invite-people`.
export const slug = (text: string): string =>
	text
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean)
		.join("-");

// The part of a shot's file name that names the control open in it, if any.
export const openedPart = (opened?: string): string =>
	opened ? `-open-${slug(opened)}` : "";
