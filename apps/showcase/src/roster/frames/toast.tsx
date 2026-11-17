import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Code } from "@fcalell/plugin-react-ui/components/code";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { type ToastData, toast } from "@fcalell/plugin-react-ui/lib/toast";
import { useEffect, useRef } from "react";
import type { ShowcaseFrame } from "../cells.ts";
import { onceStanding } from "../judge.ts";
import { StandInList } from "./layout-context.tsx";
import { Stage } from "./overlay-stage.tsx";

const act = () => {};
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
const JOIN = "https://app.example.com/join?code=7k2m-9xq4-4tpw-h8nz";

// A Gate with a bottom sheet open, the Gate's toasts' layer over it, so the
// frame reads both boxes and logs an error when a toast overlaps the sheet.
// On touch the sheet names itself the anchor the layer stands above, so the
// toast covers the page behind the sheet's top edge and never the sheet's
// sentence, its address or its act; on the desktop the sheet is a card and the
// toast stands at the corner.
function OverSheet() {
	const stage = useRef<HTMLDivElement>(null);
	useEffect(() => {
		// The sheet mounts in the portal a commit after the frame and the toast
		// after its queue lands: once both stand and have been laid out a few
		// frames, read their boxes.
		return onceStanding(
			() => {
				const sheet = stage.current?.querySelector("[role=dialog]");
				const toast = stage.current?.querySelector("[data-toast]");
				return sheet && toast ? { sheet, toast } : undefined;
			},
			WAIT,
			SETTLE,
			({ sheet, toast }) => {
				const over = sheet.getBoundingClientRect();
				const on = toast.getBoundingClientRect();
				const apart =
					on.bottom <= over.top ||
					on.top >= over.bottom ||
					on.right <= over.left ||
					on.left >= over.right;
				if (!apart) console.error("the toast stands over the open sheet");
			},
		);
	}, []);
	return (
		<div ref={stage}>
			<Stage contain>
				<Gate title="Devices">
					<Sheet
						open
						onClose={act}
						title="Add a device"
						description="Scan the code with the device, or open the address on it."
					>
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
// `raise` raises the stack from one frame of the page, after the page's root frames have mounted.
function Raised(props: { raise: boolean }) {
	const { raise } = props;
	useEffect(() => {
		if (!raise) return;
		const frame = requestAnimationFrame(() => {
			for (const { sentence, ...options } of STACK) toast(sentence, options);
		});
		return () => cancelAnimationFrame(frame);
	}, [raise]);
	return (
		<>
			<OverSheet />
			<OverPage />
		</>
	);
}

// The stack, oldest on top, raised once into the app's queue (by the light
// frame) over a Gate's open sheet and over a Shell's page, on the sentence
// cell. A toast of one tone has no frame of its own: the page's root frames
// all stand the one queue.
export function drawToast(frame: ShowcaseFrame) {
	if (frame.cell.name !== "TEXT.role.body") return undefined;
	return <Raised raise={frame.mode === "light"} />;
}
