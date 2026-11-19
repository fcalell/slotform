import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Code } from "@fcalell/plugin-react-ui/components/code";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { type ToastData, toast } from "@fcalell/plugin-react-ui/lib/toast";
import { type ReactNode, useEffect, useRef } from "react";
import type { ShowcaseScene } from "../class-sets.ts";
import { meets, onceStanding } from "../judge.ts";
import { JOIN, JOINING } from "./join.ts";
import { StandInList } from "./layout-context.tsx";
import { Stage } from "./overlay-stage.tsx";
import { act } from "./section-rows.ts";

const STACK: ToastData[] = [
	{
		sentence: "Deployment started",
		act: { label: "View", onAct: act },
	},
	{ sentence: "Build is slower than usual", tone: "attention" },
	{
		sentence: "Couldn’t reach the API",
		tone: "failed",
		act: { label: "Retry", onAct: act },
	},
	// A short report is a pill on touch, never a full-width card.
	{ sentence: "Works." },
];

// The frames the check waits for the sheet and the toast to stand, and then for
// the layer to be laid out.
const WAIT = 120;
const SETTLE = 4;

// A Gate with a bottom sheet open, the Gate's toasts' layer over it, so the
// scene reads both boxes and logs an error when a toast overlaps the sheet.
// On touch the sheet names itself the anchor the layer stands above, so the
// toast covers the page behind the sheet's top edge and never the sheet's
// sentence, its address or its act; on the desktop the sheet is a card and the
// toast stands at the corner.
function OverSheet() {
	const stage = useRef<HTMLDivElement>(null);
	useEffect(() => {
		// The sheet mounts in the portal a commit after the scene and the toast
		// after its queue lands: once both stand and have been laid out a few
		// scenes, read their boxes.
		return onceStanding(
			() => {
				const sheet = stage.current?.querySelector("[role=dialog]");
				const toast = stage.current?.querySelector("[data-toast]");
				return sheet && toast ? { sheet, toast } : undefined;
			},
			WAIT,
			SETTLE,
			({ sheet, toast }) => {
				if (meets(toast.getBoundingClientRect(), sheet.getBoundingClientRect()))
					console.error("the toast stands over the open sheet");
			},
		);
	}, []);
	return (
		<div ref={stage}>
			<Stage contain>
				<Gate title="Devices">
					<Sheet open onClose={act} {...JOINING}>
						<Code text={JOIN} copy />
					</Sheet>
				</Gate>
			</Stage>
		</div>
	);
}

// The Shell's layer over a page that docks no foot, as `main` holds them: docs/architecture/ui-core/layout.md, "Foot".
function OverPage() {
	return (
		<Stage contain>
			<Shell
				places={[{ label: "Agent", icon: "Bot", route: location.pathname }]}
			>
				<Pane>
					<StandInList />
					<Button label="Send a test" onAct={act} />
				</Pane>
			</Shell>
		</Stage>
	);
}

// The app's one toast queue: docs/architecture/ui-core/layout.md, "Toasts".
// The stack is raised from one frame of the page, after the stage's root
// container has mounted.
function Raised(props: { children: ReactNode }) {
	useEffect(() => {
		const scene = requestAnimationFrame(() => {
			for (const { sentence, ...options } of STACK) toast(sentence, options);
		});
		return () => cancelAnimationFrame(scene);
	}, []);
	return props.children;
}

// The stack, oldest on top, raised into the app's queue, each story the one
// stage that draws it: over a Gate's open sheet, and over a Shell's page. A
// toast of one tone has no scene of its own: a root container stands the one
// queue.
export function drawToast(scene: ShowcaseScene) {
	if (scene.story === "overSheet")
		return (
			<Raised>
				<OverSheet />
			</Raised>
		);
	if (scene.story === "overPage")
		return (
			<Raised>
				<OverPage />
			</Raised>
		);
	return undefined;
}
