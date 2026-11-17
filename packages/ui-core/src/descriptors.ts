// Framework-free descriptors, each re-exported here: docs/architecture/ui-core/roster.md, "Descriptors".

export type { IconName } from "./icon-name.ts";
export type { ChosenCount } from "./roster/action-bar.ts";
export type {
	CanvasEdge,
	CanvasGroup,
	CanvasNode,
	CanvasPath,
	CanvasPoint,
	CanvasRole,
} from "./roster/canvas.ts";
export type * from "./roster/descriptors.ts";
export type { DiffLine, Hunk } from "./roster/diff.ts";
export type { Track } from "./roster/dock.ts";
export type { RecordFact } from "./roster/pane.ts";
export type { ChoiceSegment } from "./roster/picker.ts";
export type {
	EitherPick,
	EitherValue,
	Rule,
	RuleTerms,
	RuleValue,
} from "./roster/rules.ts";
export type {
	Band,
	FileItem,
	Lock,
	Row,
	RowEntry,
	RowItem,
} from "./roster/section.ts";
export type { GroupSpec, PlaceSpec } from "./roster/shell.ts";
export type { Stage, StageEnd, StepState } from "./roster/stages.ts";
export type { CountLink, MeterMark, StatSpec } from "./roster/stats.ts";
export type {
	CellValue,
	ChangeCell,
	ChoiceSlots,
	ColumnWidth,
	DragSource,
	TableCell,
	TableChoice,
	TableColumn,
	TablePick,
	TableRowSlots,
} from "./roster/table.ts";
export type {
	Attachment,
	Message,
	MessageDetail,
	Notice,
} from "./roster/thread.ts";
export type { ToolbarChip, ToolbarSearch } from "./roster/toolbar.ts";
export type { ChipFamily, Tone } from "./tokens.ts";
