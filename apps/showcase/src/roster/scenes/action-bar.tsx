import { ApiError } from "@fcalell/plugin-api/error";
import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Text } from "@fcalell/plugin-react-ui/components/text";
import type { Act } from "@fcalell/ui-core/descriptors";
import { GATE_COLUMN } from "@fcalell/ui-core/variants";
import type { ShowcaseScene } from "../class-sets.ts";
import { fail, hang, Pressed } from "./pending.tsx";

// The server refuses the act, wording a machine name between backticks.
const refuse = () =>
	Promise.reject(
		new ApiError("BAD_REQUEST", {
			message:
				"`/tmp/acme-build-9180/services/billing-missing` is not a directory, so the service does not run.",
		}),
	);

import { Column } from "./place.tsx";
import { Publish } from "./table.tsx";

const change = () => {};

interface Drawn {
	// Drawn in a sign-in column, where the bar stacks its acts.
	column: boolean;
	acts: Act[];
	reason: string;
}

const SAVE: Drawn = {
	column: false,
	acts: [
		{ label: "Cancel", onAct: change },
		{ label: "Save", onAct: change },
	],
	reason: "Describe the change first.",
};
const CONFIRM: Drawn = {
	column: false,
	acts: [
		{ label: "Cancel", onAct: change },
		{ label: "Delete project", onAct: change, destructive: true },
	],
	reason: "Type the project's name first.",
};
const ROW_ACTS: Drawn = {
	column: false,
	acts: [
		{ label: "Remove member", onAct: change, destructive: true },
		{ label: "Save", onAct: change },
	],
	reason: "Choose a role first.",
};
// Four acts in the narrowest column an end bar stands in above touch: they
// wrap to a further row, the filled act last, and stay inside the column.
const WRAPPED: Act[] = [
	{ label: "Cut the scope in the thread", onAct: change },
	{ label: "Split the work in its thread", onAct: change },
	{ label: "Accept the flags as known limits", onAct: change },
	{ label: "Continue refining", onAct: change },
];
// A sign-in column's two ways in: at its width one a row, the filled act
// first.
const LOGIN: Drawn = {
	column: true,
	acts: [
		{ label: "Use a recovery code", onAct: change },
		{ label: "Continue with email", onAct: change },
	],
	reason: "Enter your email address first.",
};

// A sheet's footer by default; the danger class set a confirm's, the destructive
// class set a destructive secondary beside the filled act, the full fit and the
// field fit a login column's two ways in, the meta class set a chosen bar's count over a
// list. `pending` presses the filled act into one that never settles, `error`
// into one the server refuses (its sentence in the bar's kept line, the act
// ready again), `disabled` it blocked with its reason at rest under the acts. A bar whose data is not here paints in a
// Form's or a Sheet's drawer, where the scene's read waits.
function drawnOf(classSet: string): Drawn {
	if (
		classSet === "BUTTON.act.danger" ||
		classSet === "BUTTON_LABEL.act.danger"
	)
		return CONFIRM;
	if (
		classSet === "BUTTON.act.destructive" ||
		classSet === "BUTTON_LABEL.act.destructive"
	)
		return ROW_ACTS;
	if (classSet === "BUTTON.fit.field") return LOGIN;
	return SAVE;
}

const PENDING = { sentence: "Merging the change" };
// A bar of one, two and three acts, each swapped for its pending form.
const SWAPPED: Act[][] = [
	[{ label: "Merge", onAct: change }],
	[
		{ label: "Close", onAct: change },
		{ label: "Merge", onAct: change },
	],
	[
		{ label: "Decline", onAct: change, destructive: true },
		{ label: "Close", onAct: change },
		{ label: "Merge", onAct: change },
	],
];

// A bar of `acts` loaded and the same bar pending, a line below each so the
// swap's shift shows.
function Swapped(props: { acts: Act[] }) {
	const { acts } = props;
	return (
		<div className="flex flex-col gap-section">
			<div data-swap="loaded" className="flex flex-col">
				<ActionBar acts={acts} />
				<Text kind="meta">Below the bar</Text>
			</div>
			<div data-swap="pending" className="flex flex-col">
				<ActionBar acts={acts} pending={PENDING} />
				<Text kind="meta">Below the bar</Text>
			</div>
		</div>
	);
}

// The swap for a bar of one, two and three acts and for the four-act bar that wraps.
function Swaps() {
	return (
		<>
			{SWAPPED.map((acts) => (
				<Swapped key={acts.length} acts={acts} />
			))}
			<div className="w-list max-w-full">
				<Swapped acts={WRAPPED} />
			</div>
		</>
	);
}

export function drawActionBar(scene: ShowcaseScene) {
	// The meta class set is the selection count: a publish page's bar docked at
	// its foot, the act pending in `pending` and blocked in `disabled`.
	if (scene.classSet.name === "TEXT.role.meta") {
		const page = <Publish state={scene.state} />;
		return <Column>{page}</Column>;
	}
	const { column, acts, reason } = drawnOf(scene.classSet.name);
	const last = acts.length - 1;
	const drawn = acts.map((act, at) =>
		at !== last
			? act
			: {
					...act,
					onAct:
						scene.state === "pending"
							? hang
							: scene.state === "error"
								? fail
								: act.onAct,
					failed: "That change could not be saved.",
					blocked: scene.state === "disabled" ? reason : undefined,
				},
	);
	const bar = column ? (
		<div className={GATE_COLUMN}>
			<ActionBar acts={drawn} />
		</div>
	) : (
		<ActionBar acts={drawn} />
	);
	if (scene.state === "error" && scene.classSet.name === "BUTTON.fit.body")
		return (
			<div className="flex flex-col gap-section">
				<Pressed label={acts[last]?.label}>{bar}</Pressed>
				{/* The line a refusal draws: the server words a machine name between backticks, and it stands boxed in the mono, wrapping whole. */}
				<Pressed label="Restart">
					<div className="w-list max-w-full">
						<ActionBar acts={[{ label: "Restart", onAct: refuse }]} />
					</div>
				</Pressed>
			</div>
		);
	if (scene.state === "pending" || scene.state === "error")
		return <Pressed label={acts[last]?.label}>{bar}</Pressed>;
	if (scene.classSet.name === "BUTTON.fit.body" && scene.state === "rest")
		return (
			<div className="flex flex-col gap-section">
				{bar}
				<div className="w-list max-w-full">
					<ActionBar acts={WRAPPED} />
				</div>
				<Swaps />
			</div>
		);
	return bar;
}
