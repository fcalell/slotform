import { Composer } from "@slotform/react-ui/components/thread";
import type {
	Attachment,
	Notice,
	PickedFile,
} from "@slotform/ui-core/descriptors";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { ShowcaseScene } from "../class-sets.ts";
import { Wide } from "./layout-context.tsx";
import { SCREEN } from "./pictures.ts";
import { act } from "./section-rows.ts";

const PLACEHOLDER = "Ask about this project";
const ASKED = "Why did the last deploy of api fail?";
const GROWN = [
	"Open 0042_add_invoices and read it with me.",
	"If the column is missing on staging too, say so first.",
	"Then redeploy api.",
].join("\n");
const CAPPED = [
	"Open 0042_add_invoices and read it with me.",
	"If the column is missing on staging too, say so first.",
	"Then run it on staging and check the invoices page.",
	"If the page loads, run the backfill for October.",
	"Compare the totals with the billing export.",
	"If they differ by more than one invoice, stop there.",
	"Otherwise redeploy api to production,",
	"watch the error rate for ten minutes,",
	"and post the result in #deploys.",
	"Keep web on the old build until I say so.",
].join("\n");
const FILES: Attachment[] = [
	{ id: "a", name: "deploy-api-4f2c.log" },
	{ id: "b", name: "deploy-api-a81d-production-rollback.log" },
	{ id: "c", name: "wrangler.toml" },
];
// An image and a file, as the viewer pastes or drops them.
const PICTURES: Attachment[] = [
	{ id: "p", name: "Checkout page after the failed payment", src: SCREEN },
	{ id: "q", name: "deploy-4f2c.log" },
];
const UPGRADE: Notice = {
	sentence: "12 of 50 answers left this month.",
	act: { label: "Upgrade", onAct: act },
};
const QUEUED: Notice = {
	sentence: "A message sent now is read once this answer ends.",
};

// A consumer's answer to `onAttach`: the picked file's own local address
// draws as its thumbnail (an image has one, any other file only its name).
function attachmentOf(file: PickedFile): Attachment {
	return { id: crypto.randomUUID(), name: file.name, src: file.src };
}

// A picked file's local address is the consumer's to let go once the file leaves.
function release(file: Attachment | undefined) {
	if (file?.src?.startsWith("blob:")) URL.revokeObjectURL(file.src);
}

// One input as a viewer drives it: typing, sending (which clears the text
// and works until Stop), attaching (the dialog, a paste, a drop) and
// detaching.
function Live(props: {
	value?: string;
	attachments?: Attachment[];
	notice?: Notice;
	working?: boolean;
	unstoppable?: boolean;
	disabled?: boolean;
}) {
	const [value, setValue] = useState(props.value ?? "");
	const [working, setWorking] = useState(props.working ?? false);
	const [files, setFiles] = useState(props.attachments);
	const held = useRef(files);
	held.current = files;
	useEffect(
		() => () => {
			for (const file of held.current ?? []) release(file);
		},
		[],
	);
	return (
		<Composer
			value={value}
			onChange={setValue}
			attachments={files}
			onAttach={(picked) =>
				setFiles((now) => [...(now ?? []), ...picked.map(attachmentOf)])
			}
			onDetach={(id) => {
				setFiles((now) => now?.filter((file) => file.id !== id));
				release(files?.find((file) => file.id === id));
			}}
			placeholder={PLACEHOLDER}
			notice={props.notice}
			working={working}
			onSend={() => {
				setValue("");
				setWorking(true);
			}}
			onStop={props.unstoppable ? undefined : () => setWorking(false)}
			disabled={props.disabled}
		/>
	);
}

// Board 53's input scenes, the shape by the page's density: disabled with its notice; at rest the scenes
// whose part the class set names (Send for the primary act, Stop beside it for
// the secondary and the icon act, the notice's act for the bar fit, the chips
// for the chip and its glyph, the field and its text for the field, the empty
// input for the notice's line).
function Rest(props: { classSet: string }) {
	const { classSet } = props;
	if (
		classSet.startsWith("BUTTON_LABEL.act.primary") ||
		classSet === "BUTTON.act.primary"
	)
		return <Live value={ASKED} />;
	if (
		classSet.startsWith("BUTTON_LABEL.act.secondary") ||
		classSet === "BUTTON.act.secondary"
	)
		return (
			<>
				<Live working notice={QUEUED} />
				<Live working notice={QUEUED} value="Then redeploy web too" />
				<Live working unstoppable />
			</>
		);
	if (classSet.startsWith("CHIP") || classSet === "ICON.fit.meta")
		return (
			<Live value="What changed between these two runs?" attachments={FILES} />
		);
	if (classSet.startsWith("IMAGE") || classSet === "MESSAGE_ATTACHMENTS")
		return <Live value="Why did this payment fail?" attachments={PICTURES} />;
	if (classSet.startsWith("FIELD"))
		return (
			<>
				<Live />
				<Live value={GROWN} />
				<Live value={CAPPED} />
			</>
		);
	if (classSet === "TEXT.role.meta")
		return (
			<>
				<Live notice={UPGRADE} />
				<Live
					notice={{
						sentence: "Answers can be wrong; check them before you deploy.",
					}}
				/>
			</>
		);
	return <Live />;
}

// The composer's scenes, drawn by the Thread's frame.
export function drawComposer(scene: ShowcaseScene) {
	let drawn: ReactNode;
	if (scene.state === "disabled")
		drawn = <Live disabled notice={{ sentence: "This thread is archived." }} />;
	else drawn = <Rest classSet={scene.classSet.name} />;
	return <Wide>{drawn}</Wide>;
}
