import { Stages } from "@slotform/react-ui/components/stages";
import type { Stage } from "@slotform/ui-core/descriptors";
import type { ShowcaseScene } from "../class-sets.ts";
import { waiting } from "../waiting.ts";
import { Wide } from "./layout-context.tsx";
import { isPaint } from "./painted.tsx";

// A feature request's four fixed states: done ones dated, the current one
// marked, the later one grey.
const IN_BUILD = [
	{ label: "Submitted", state: "done", at: "2026-09-14T09:12:00Z" },
	{ label: "In spec", state: "done", at: "2026-09-16T15:40:00Z" },
	{ label: "In build", state: "current", at: "2026-09-22T08:05:00Z" },
	{ label: "Live", state: "later" },
] as const;

// The same request turned down at spec: the later stages give way to the
// terminal row.
const REJECTED = [
	{ label: "Submitted", state: "done", at: "2026-09-14T09:12:00Z" },
	{ label: "In spec", state: "current" },
	{ label: "In build", state: "later" },
	{ label: "Live", state: "later" },
] as const;

// A rail whose later stages stand mid-rail, one after another: each one meta
// line, standing at a dated stage's pitch.
const IN_SPEC = [
	{ label: "Submitted", state: "done", at: "2026-09-14T09:12:00Z" },
	{ label: "In spec", state: "current", at: "2026-09-16T15:40:00Z" },
	{ label: "In build", state: "later" },
	{ label: "In review", state: "later" },
	{ label: "Live", state: "later" },
] as const;

// Stages that never arrive: a rail given them stays painted.
const waitingSteps = waiting.at((): readonly Stage[] => []);

// Every class set draws the rail in flight, one with later stages mid-rail and the
// rail ended under them; the loading state and a paint class set draw the painted
// rail (the paint class set beside the loaded one).
export function drawStages(scene: ShowcaseScene) {
	if (isPaint(scene))
		return scene.state === "rest" ? (
			<Wide>
				<Stages steps={IN_BUILD} />
				<Stages steps={waitingSteps} />
			</Wide>
		) : undefined;
	if (scene.state === "loading")
		return (
			<Wide>
				<Stages steps={waitingSteps} />
			</Wide>
		);
	return (
		<Wide>
			<Stages steps={IN_BUILD} />
			<Stages steps={IN_SPEC} />
			<Stages
				steps={REJECTED}
				ended={{
					label: "Rejected",
					reason: "Out of scope this quarter: resubmit with a narrower ask.",
				}}
			/>
		</Wide>
	);
}
