import {
	type MessageRegions,
	Thread,
} from "@fcalell/plugin-react-ui/components/thread";
import type {
	Attachment,
	MessageDetail,
	Run,
} from "@fcalell/ui-core/descriptors";
import type { ReactNode } from "react";
import type { ShowcaseScene } from "../class-sets.ts";
import { waiting } from "../waiting.ts";
import { Wide } from "./layout-context.tsx";
import { isPaint } from "./painted.tsx";
import { SCREEN } from "./pictures.ts";
import { act } from "./section-rows.ts";

// A moment today at a board's time, as an ISO string the Message formats.
export function today(time: string): string {
	const [hours = 0, minutes = 0] = time.split(":").map(Number);
	const at = new Date();
	at.setHours(hours, minutes, 0, 0);
	return at.toISOString();
}

export const REPLY =
	"The build failed on step 4. The migration `0042_add_invoices` reads a column the production database does not have yet.\n\nRun the pending migration against production, then redeploy.";

export const ATTACHED: Attachment[] = [
	{ id: "shot", name: "Checkout page after the failed payment", src: SCREEN },
	{ id: "log", name: "deploy-api-4f2c.log" },
];

export interface Turn {
	id: string;
	author: "you" | "other" | "system";
	body: string;
	at?: string;
	opens?: boolean;
	detail?: MessageDetail;
	// What came with a turn, and where it came from.
	attachments?: Attachment[];
	from?: Run[];
}

const NAME = { you: "You", other: "Assistant" } as const;

// The Message regions every turn fills.
export const TURN: MessageRegions<Turn> = {
	key: (turn) => turn.id,
	author: (turn) => turn.author,
	name: (turn) => (turn.author === "system" ? undefined : NAME[turn.author]),
	body: (turn) => turn.body,
	at: (turn) => turn.at,
	onOpen: (turn) => (turn.opens ? act : undefined),
	detail: (turn) => turn.detail,
	attachments: (turn) => turn.attachments,
	from: (turn) => turn.from,
};

// Board 53's context: a thread's pane, the surface a thread stands on.
function Pane(props: { children: ReactNode }) {
	return (
		<div className="flex flex-col gap-stack rounded-card border border-edge bg-surface p-page">
			{props.children}
		</div>
	);
}

type Author = Turn["author"];

// The author a class set stands for: a `MESSAGE.author` class set its own, the strong
// name another's, the provenance line, the chevron and the code a system line's,
// the body line yours.
const YOURS = [
	"MESSAGE.author.you",
	"TEXT.role.body",
	"MESSAGE_ATTACHMENTS",
	"IMAGE.fit.thumb",
	"IMAGE_PICTURE.fit.thumb",
	"CHIP_LABEL",
];
const SYSTEMS = [
	"MESSAGE.author.system",
	"TEXT.role.meta",
	"TEXT.role.code",
	"LINE_BOX.role.meta",
	"ICON.fit.meta",
];

function authorOf(classSet: string): Author {
	if (YOURS.includes(classSet)) return "you";
	if (SYSTEMS.includes(classSet)) return "system";
	return "other";
}

const LINK =
	"https://acme.dev/deploys/api/4f2c9a1e7b3d5f60a8c2e4b6d8f0a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d3f5";

// Each author's messages at rest, in one thread each.
const RESTING: Record<Author, Turn[]> = {
	you: [
		{
			id: "you-asked",
			author: "you",
			body: "Why did the last deploy of api fail?",
			at: today("10:02"),
		},
		{
			id: "you-long",
			author: "you",
			body: "Open the migration, and hold the redeploy until I have read it. If the column is missing on staging too, tell me before you touch anything.",
		},
		{ id: "you-link", author: "you", body: `Read ${LINK}` },
		{
			id: "you-shot",
			author: "you",
			body: "Why did this payment fail?",
			at: today("10:07"),
			attachments: ATTACHED,
		},
		{
			id: "you-from",
			author: "you",
			body: "Open the migration and hold the redeploy.",
			from: ["via email", "Front desk"],
			at: today("10:08"),
		},
		{
			id: "you-only-shot",
			author: "you",
			body: "",
			attachments: ATTACHED.slice(0, 1),
			from: ["via email"],
		},
	],
	other: [
		{ id: "other-reply", author: "other", body: REPLY, at: today("10:03") },
		{
			id: "other-opened",
			author: "other",
			body: "Opened `0042_add_invoices`. The redeploy waits for you.",
		},
		{
			id: "other-shot",
			author: "other",
			body: "Here is the page as the customer saw it.",
			attachments: ATTACHED,
			from: ["Front desk"],
			at: today("10:09"),
		},
		{
			id: "other-log",
			author: "other",
			body: "The full log is attached.",
			attachments: ATTACHED.slice(1),
			at: today("10:10"),
		},
	],
	system: [
		{
			id: "system-joined",
			author: "system",
			body: "Ada Lovelace joined the thread",
			at: today("10:02"),
		},
		{
			id: "system-cut",
			author: "system",
			body: "The answer was cut short: the deploy log is longer than the assistant reads at once",
			at: today("10:06"),
		},
		{ id: "system-link", author: "system", body: `Relayed ${LINK}` },
		{
			id: "system-relayed",
			author: "system",
			body: "Relayed from #deploys",
			at: today("10:04"),
			opens: true,
		},
		{
			id: "system-reads",
			author: "system",
			body: "Read 3 files",
			at: today("10:04"),
			detail: {
				fold: "migrations/0042_add_invoices.sql\nsrc/db/schema.ts\nwrangler.toml",
			},
		},
		{
			id: "system-ran",
			author: "system",
			body: "Ran migrate",
			at: today("10:06"),
			detail: { code: "0042_add_invoices --env production" },
		},
		{
			id: "system-proposed",
			author: "system",
			body: "Proposed a redeploy",
			at: today("10:06"),
			detail: {
				row: {
					leading: { icon: "Rocket" },
					title: "Redeploy api to production",
					facts: [
						{ tone: "waiting", label: "Waits for you" },
						"Deploy",
						"After the migration",
					],
					onOpen: act,
				},
			},
		},
	],
};

// Turns that never arrive: a thread given them paints an ask of yours over
// the other author's reply.
const WAITING_TURNS = waiting.at((): readonly Turn[] => []);

// Board 53's message class sets, each a Thread of its author's messages on a
// thread's pane, drawn by the Thread's frame: each author at rest, and the
// painted thread while its items are not here (a system line is never
// painted); the paint class set draws a reply beside the painted thread.
export function drawMessages(scene: ShowcaseScene) {
	const author = authorOf(scene.classSet.name);
	const painted = <Thread items={WAITING_TURNS} message={TURN} />;
	if (isPaint(scene))
		return scene.state === "rest" ? (
			<Wide>
				<Pane>
					<Thread items={RESTING.other.slice(0, 1)} message={TURN} />
					{painted}
				</Pane>
			</Wide>
		) : undefined;
	if (scene.state === "loading")
		return author === "system" ? undefined : (
			<Wide>
				<Pane>{painted}</Pane>
			</Wide>
		);
	return (
		<Wide>
			<Pane>
				<Thread items={RESTING[author]} message={TURN} />
			</Pane>
		</Wide>
	);
}
