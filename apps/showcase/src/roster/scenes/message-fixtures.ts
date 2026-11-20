import type { MessageRegions } from "@slotform/react-ui/components/thread";
import type {
	Attachment,
	MessageDetail,
	Run,
} from "@slotform/ui-core/descriptors";
import { SCREEN } from "./pictures.ts";
import { act } from "./section-rows.ts";

// The turns the Thread, Message, Sheet and Pane scenes share.

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

// A conversation of every kind of turn.
export const TURNS: Turn[] = [
	{
		id: "t1",
		author: "system",
		body: "Thread started from the failed deploy of api",
		at: today("10:02"),
	},
	{
		id: "t2",
		author: "you",
		body: "Why did the last deploy of api fail?",
		at: today("10:02"),
	},
	{
		id: "t3",
		author: "other",
		body: `${REPLY} I can open the migration for you.`,
		at: today("10:03"),
	},
	{
		id: "t4",
		author: "system",
		body: "Relayed from #deploys",
		at: today("10:04"),
		opens: true,
	},
	{
		id: "t4-reads",
		author: "system",
		body: "Read 3 files",
		at: today("10:04"),
		detail: {
			fold: "migrations/0042_add_invoices.sql\nsrc/db/schema.ts\nwrangler.toml",
		},
	},
	{
		id: "t5",
		author: "you",
		body: "Open it, and hold the redeploy until I have read it.",
		at: today("10:05"),
		from: ["via email", "Front desk"],
	},
	{
		id: "t5-shot",
		author: "you",
		body: "Why did this payment fail?",
		at: today("10:05"),
		attachments: ATTACHED,
	},
	{
		id: "t6",
		author: "other",
		body: "Opened `0042_add_invoices`. The redeploy waits for you.",
		at: today("10:05"),
	},
	{
		id: "t6-log",
		author: "other",
		body: "The log of that deploy is attached.",
		at: today("10:05"),
		attachments: ATTACHED.slice(1),
	},
	{
		id: "t7",
		author: "system",
		body: "Ran migrate",
		at: today("10:06"),
		detail: { code: "0042_add_invoices --env production" },
	},
	{
		id: "t8",
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
	{
		id: "t9",
		author: "system",
		body: "Named the change set",
		at: today("10:06"),
		detail: {
			row: {
				leading: { icon: "GitBranch" },
				title: {
					quoted: "Backfill the invoice totals before the redeploy goes out",
				},
				facts: ["Change set"],
				onOpen: act,
			},
		},
	},
];
