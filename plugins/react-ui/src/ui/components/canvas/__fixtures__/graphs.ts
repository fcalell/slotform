import { pathOrder } from "@slotform/ui-core/canvas";
import type {
	CanvasEdge,
	CanvasGroup,
	CanvasNode,
	CanvasPath,
} from "@slotform/ui-core/descriptors";

// The graphs the canvas layout is tested with, as plain data so a node test
// reads them.

interface Graph {
	nodes: CanvasNode[];
	edges: CanvasEdge[];
	groups?: CanvasGroup[];
	path?: CanvasPath;
}

// A workflow: a loop in a group, a gate's answer going back upstream, and a
// handoff to another team. No node has a position, so the canvas places them.
export const WORKFLOW: Graph = {
	nodes: [
		{
			id: "start",
			icon: "Play",
			overline: "Trigger",
			title: "Start",
			line: "Every weekday",
		},
		{
			id: "plan",
			icon: "ListChecks",
			overline: "Plan",
			title: "Draft a plan",
			line: "Writes the steps",
		},
		{
			id: "build",
			icon: "Hammer",
			overline: "Build",
			title: "Make the change",
			line: "Edits the files",
		},
		{
			id: "check",
			icon: "ShieldCheck",
			overline: "Check",
			title: "Run the checks",
			line: "Tests and lint",
			count: 3,
		},
		{
			id: "gate",
			icon: "GitBranch",
			overline: "Gate",
			title: "Is it green?",
			line: "Pass or send back",
		},
		{
			id: "review",
			icon: "Eye",
			overline: "Review",
			title: "Review",
			line: "Reads the changes",
		},
		{
			id: "handoff",
			icon: "Send",
			overline: "Handoff",
			title: "Hand over",
			line: "Another team ships it",
		},
	],
	edges: [
		{ id: "start-plan", from: "start", to: "plan" },
		{ id: "plan-build", from: "plan", to: "build" },
		{ id: "build-check", from: "build", to: "check" },
		{ id: "check-build", from: "check", to: "build", label: "red" },
		{ id: "check-gate", from: "check", to: "gate" },
		{ id: "gate-plan", from: "gate", to: "plan", label: "uncertain" },
		{ id: "gate-review", from: "gate", to: "review", label: "green" },
		{
			id: "review-handoff",
			from: "review",
			to: "handoff",
			label: "approve",
			handoff: true,
		},
	],
	groups: [
		{
			id: "loop",
			head: "Until green · repeat 2×",
			holds: ["build", "check"],
		},
	],
};

const LEGS: CanvasNode[] = [
	{
		id: "begin",
		icon: "Play",
		overline: "Page",
		title: "Start",
		line: "Opens the flow",
	},
	{
		id: "a1",
		icon: "FileText",
		overline: "Page",
		title: "Short form",
		line: "One question",
	},
	{
		id: "a2",
		icon: "Mail",
		overline: "Message",
		title: "Reminder",
		line: "After a day",
	},
	{
		id: "b1",
		icon: "FileText",
		overline: "Page",
		title: "Long form",
		line: "Five questions",
	},
	{
		id: "b2",
		icon: "Mail",
		overline: "Message",
		title: "Follow-up",
		line: "After three days",
	},
	{
		id: "c1",
		icon: "Phone",
		overline: "Message",
		title: "Call",
		line: "Booked by hand",
	},
	{
		id: "merge",
		icon: "GitMerge",
		overline: "Page",
		title: "Confirm",
		line: "Where the legs meet",
	},
	{
		id: "finish",
		icon: "Check",
		overline: "Page",
		title: "Done",
		line: "Ends the flow",
	},
];

const BRANCHES: CanvasEdge[] = [
	{ id: "begin-a1", from: "begin", to: "a1", label: "Option 1" },
	{ id: "begin-b1", from: "begin", to: "b1", label: "Option 2" },
	{ id: "begin-c1", from: "begin", to: "c1", label: "Option 3" },
	{ id: "a1-a2", from: "a1", to: "a2" },
	{ id: "b1-b2", from: "b1", to: "b2" },
	{ id: "a2-merge", from: "a2", to: "merge" },
	{ id: "b2-merge", from: "b2", to: "merge" },
	{ id: "c1-merge", from: "c1", to: "merge" },
	{ id: "merge-finish", from: "merge", to: "finish" },
];

// A journey: three legs and a rejoin, its nodes numbered in path order the
// way a consumer numbers them, from the library.
const NUMBERS = new Map(
	pathOrder(LEGS, BRANCHES).map((id, index) => [id, index + 1]),
);
export const JOURNEY: Graph = {
	nodes: LEGS.map((node) => ({ ...node, number: NUMBERS.get(node.id) })),
	edges: BRANCHES,
};

// Two loops under a step, one the first part of the other (a deploy's work and
// its fix): under the text floor each head draws at its own size on screen and
// the nodes spread by its growth, so no head covers the step above its loop.
export const LOOPS: Graph = {
	nodes: [
		{
			id: "begin",
			icon: "Zap",
			role: "start",
			overline: "Trigger",
			title: "A call, on a unit",
			line: "Starts the run",
		},
		{
			id: "setup",
			icon: "Terminal",
			overline: "Command",
			title: "Setup",
			line: "Runs the setup",
		},
		{
			id: "build",
			icon: "Sparkles",
			overline: "Agent",
			title: "Build",
			line: "Makes the change",
		},
		{
			id: "check",
			icon: "Terminal",
			overline: "Command",
			title: "Check",
			line: "Runs the check",
		},
		{
			id: "review",
			icon: "Hand",
			role: "wait",
			overline: "Gate",
			title: "Ready",
			line: "Approve or Request changes",
		},
		{
			id: "deploy",
			icon: "Flag",
			role: "end",
			overline: "End",
			title: "Deployed",
			line: "Closes the run",
		},
	],
	edges: [
		{ id: "begin-setup", from: "begin", to: "setup" },
		{ id: "setup-build", from: "setup", to: "build" },
		{ id: "build-check", from: "build", to: "check" },
		{ id: "check-build", from: "check", to: "build", label: "red" },
		{ id: "check-review", from: "check", to: "review", label: "green" },
		{
			id: "review-build",
			from: "review",
			to: "build",
			label: "request changes",
		},
		{ id: "review-deploy", from: "review", to: "deploy", label: "approve" },
	],
	groups: [
		{
			id: "work",
			head: "Work · same result 5×, at most 8 attempts",
			holds: ["fix", "review"],
		},
		{
			id: "fix",
			head: "Fix · same result 2×, at most 8 attempts",
			holds: ["build", "check"],
		},
	],
};

// A gate's answers fanned out, each chip on its own arrow: two, and the three
// an edit makes of them, whose words give the gate's line a second line, so the
// gate grows after the layout the edit asks for has run.
const ANSWERING: CanvasNode[] = [
	{
		id: "verdict",
		icon: "Variable",
		overline: "Value",
		title: "Verdict met",
		line: "Sets verdict",
	},
	{
		id: "ready",
		icon: "Hand",
		role: "wait",
		overline: "Gate",
		title: "Ready",
		line: "Approve or Request changes",
	},
	{
		id: "deploy",
		icon: "Wrench",
		overline: "Command",
		title: "Deploy",
		line: "Deploys the build to the target",
	},
	{
		id: "note",
		icon: "Variable",
		overline: "Value",
		title: "Changes note",
		line: "Sets note",
	},
	{
		id: "deployed-as",
		icon: "Variable",
		overline: "Value",
		title: "Deployed as",
		line: "Sets build",
	},
	{
		id: "deployed",
		icon: "Flag",
		role: "end",
		overline: "End",
		title: "Deployed",
		line: "Closes the run",
	},
];
const ANSWERS_TWO: Graph = {
	nodes: ANSWERING,
	edges: [
		{ id: "verdict>ready", from: "verdict", to: "ready" },
		{
			id: "ready>deploy:approve",
			from: "ready",
			to: "deploy",
			label: "approve",
		},
		{
			id: "ready>note:request changes",
			from: "ready",
			to: "note",
			label: "request changes",
		},
		{ id: "deploy>deployed-as", from: "deploy", to: "deployed-as" },
		{ id: "deployed-as>deployed", from: "deployed-as", to: "deployed" },
		{ id: "note>deployed", from: "note", to: "deployed" },
	],
};
export const ANSWERS_THREE: Graph = {
	nodes: ANSWERING.map((node) =>
		node.id === "ready"
			? { ...node, line: "Approve, Request changes or Revise" }
			: node,
	),
	edges: [
		...ANSWERS_TWO.edges,
		{
			id: "ready>deployed:revise",
			from: "ready",
			to: "deployed",
			label: "revise",
		},
	],
};

// Every role a node can take, in one graph: a start, a step, a decision whose
// answers label its out-edges, a wait on a person, a call that opens
// another graph, and an end. The wait's and the call's status labels stand at
// twelve characters, which the node's width holds whole.
export const ROLES: Graph = {
	nodes: [
		{
			id: "begin",
			icon: "Play",
			role: "start",
			overline: "Trigger",
			title: "Start",
			line: "Every weekday",
		},
		{
			id: "plan",
			icon: "ListChecks",
			role: "step",
			overline: "Plan",
			title: "Draft a plan",
			line: "Writes the steps",
			status: { tone: "running", label: "Running 12" },
		},
		{
			id: "gate",
			icon: "GitBranch",
			role: "decision",
			overline: "Decision",
			title: "Is it green?",
			line: "Pass or ask",
		},
		{
			id: "approve",
			icon: "Hand",
			role: "wait",
			overline: "Wait",
			title: "Awaiting review",
			line: "Asks a person first",
			status: { tone: "attention", label: "Run parked" },
		},
		{
			id: "checks",
			icon: "Workflow",
			role: "call",
			overline: "Call",
			title: "Run the checks",
			line: "Another graph",
			href: "/checks",
		},
		{
			id: "finish",
			icon: "Flag",
			role: "end",
			overline: "End",
			title: "Done",
			line: "Closes the run",
		},
	],
	edges: [
		{ id: "begin-plan", from: "begin", to: "plan" },
		{ id: "plan-gate", from: "plan", to: "gate" },
		{ id: "gate-checks", from: "gate", to: "checks", label: "green" },
		{ id: "gate-approve", from: "gate", to: "approve", label: "uncertain" },
		{ id: "checks-finish", from: "checks", to: "finish" },
		{ id: "approve-finish", from: "approve", to: "finish" },
	],
};

// A wide entry graph: a chain that ends in a fan-out of hand-offs side by side,
// a long edge label on the chain, an answer that runs back up the side and a
// loop band whose label carries an attempt count. The cards together are wider
// than a phone's pane and than a half-width pane's, so it opens fitted (as the
// overview where its cards cannot stand at the text floor), with its labels,
// its answer's arrow and its fan-out in view.
export const ENTRY: Graph = {
	nodes: [
		{
			id: "ask",
			icon: "Zap",
			role: "start",
			overline: "Trigger",
			title: "An ask",
			line: "Every request runs it",
			status: { tone: "waiting", label: "Waiting" },
		},
		{
			id: "pick",
			icon: "Sparkles",
			overline: "Intake",
			title: "Pick",
			line: "Chooses the service",
			off: true,
		},
		{
			id: "route",
			icon: "GitFork",
			role: "decision",
			overline: "Route",
			title: "Route",
			line: "The router decides every hand-off",
		},
		{ id: "intake", icon: "Sparkles", overline: "Agent", title: "Intake" },
		{
			id: "handed",
			icon: "GitFork",
			role: "decision",
			overline: "Route",
			title: "Handed",
			line: "Who takes it",
		},
		{ id: "web", icon: "Globe", overline: "Hand-off", title: "Hand to web" },
		{
			id: "mobile",
			icon: "Smartphone",
			overline: "Hand-off",
			title: "Hand to mobile",
		},
		{
			id: "billing",
			icon: "Receipt",
			overline: "Hand-off",
			title: "Hand to billing",
		},
	],
	edges: [
		{ id: "ask-pick", from: "ask", to: "pick" },
		{ id: "pick-route", from: "pick", to: "route" },
		{
			id: "route-intake",
			from: "route",
			to: "intake",
			label: "intake · web · mobile · billing",
		},
		{ id: "intake-handed", from: "intake", to: "handed" },
		{ id: "handed-web", from: "handed", to: "web", handoff: true },
		{ id: "handed-mobile", from: "handed", to: "mobile", handoff: true },
		{ id: "handed-billing", from: "handed", to: "billing", handoff: true },
		{ id: "web-intake", from: "web", to: "intake", label: "answer" },
	],
	groups: [
		{
			id: "attempts",
			head: "Until it holds · same result 5×, at most 12 attempts",
			holds: ["intake", "handed", "web"],
		},
	],
};
