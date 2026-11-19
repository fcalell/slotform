import { readFileSync } from "node:fs";

// The guide pages the UI plugins index for this package. Node-only: the name is
// read from the package's own package.json, one level above `src/` and `dist/`.
const { name } = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { name: string };

export const uiCoreGuide = [
	{
		page: "screen",
		trigger: "Building or redesigning a screen, page or route",
	},
	{
		page: "voice",
		trigger:
			"Deciding or judging how anything looks: the anchor, the decisions, the floors",
	},
	{
		page: "face-container",
		trigger:
			"Deciding or judging the look of the shell, the sidebar or a scope pick",
	},
	{
		page: "face-panes",
		trigger:
			"Deciding or judging how Panes stand side by side, their widths, or the phone's layout",
	},
	{
		page: "face-surfaces",
		trigger:
			"Deciding or judging a sheet, a card, a hairline, a corner, a control's look, the current mark, the accent or an empty state",
	},
	{
		page: "face-type",
		trigger: "Deciding or judging a type size, a face or a text ink",
	},
	{
		page: "face-rows",
		trigger:
			"Deciding or judging what a row holds and where, or a group's band",
	},
	{
		page: "face-record",
		trigger: "Deciding or judging a record's page or a pill",
	},
	{
		page: "face-badges",
		trigger: "Deciding or judging the facts of a row or a record head",
	},
	{
		page: "face-motion",
		trigger: "Deciding or judging what animates, or how a drag looks",
	},
	{
		page: "critique",
		trigger: "Judging a screen's shots: the critic's checklist",
	},
	{
		page: "critique-shape",
		trigger:
			"Running the critique on a screen's shape: its pattern, its parts, truncation and rhythm",
	},
	{
		page: "critique-marks",
		trigger: "Running the critique on a screen's words, hierarchy and marks",
	},
	{
		page: "critique-states",
		trigger:
			"Running the critique on a screen's waiting, empty, not-found, error, 320 and dark shots, and beside the anchor",
	},
	{
		page: "structure",
		trigger:
			"Building or editing a ui component: its layout, props, contexts and class strings",
	},
	{
		page: "places",
		trigger:
			"Placing a Pane on a route, titling a place or listing the Shell's places",
	},
	{
		page: "controls",
		trigger: "Placing a Button, an Input, a Switch or a Picker on a screen",
	},
	{
		page: "pictures",
		trigger: "Showing pictures or a code another device scans",
	},
	{
		page: "tone",
		trigger: "Giving a status, a Banner or a toast its tone",
	},
	{
		page: "acts",
		trigger: "Writing an act: its onAct, confirm, done or to",
	},
	{
		page: "sheets",
		trigger: "Opening a Sheet from an act or from the route",
	},
	{
		page: "links",
		trigger:
			"Adding an act that goes to a route, an icon act, or more than one act side by side",
	},
	{
		page: "forms",
		trigger:
			"Deciding whether a screen takes a Form, or a settings page that saves by field",
	},
	{
		page: "rows",
		trigger: "Giving a Section its items or writing a toRow function",
	},
	{
		page: "facts",
		trigger: "Choosing what a row or a record head says of itself",
	},
	{
		page: "frames",
		trigger: "Giving a region a read, or a record that may not be found",
	},
	{
		page: "waiting",
		trigger:
			"Drawing a screen while its reads wait, or an act or option given as a selection",
	},
	{
		page: "words",
		trigger: "Writing a string prop or a word a component draws",
	},
].map((p) => ({ domain: "ui-core", package: name, ...p }));
