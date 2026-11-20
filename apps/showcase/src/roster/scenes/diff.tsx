import { Diff } from "@slotform/react-ui/components/diff";
import { Section } from "@slotform/react-ui/components/section";
import type { Hunk } from "@slotform/ui-core/descriptors";
import { isFirstClassSet, type ShowcaseScene } from "../class-sets.ts";
import { endedAt, waitingText } from "../waiting.ts";
import { Wide } from "./layout-context.tsx";
import { isPaint } from "./painted.tsx";

// Board 51's invoice.ts: two hunks, a long added line that wraps.
const INVOICE: Hunk[] = [
	{
		header: "@@ -12,7 +12,9 @@ export function total(invoice: Invoice)",
		lines: [
			{
				kind: "context",
				text: "  const lines = invoice.lines.filter((line) => !line.void);",
				before: 12,
				after: 12,
			},
			{ kind: "context", text: "  let sum = 0;", before: 13, after: 13 },
			{
				kind: "removed",
				text: "  for (const line of lines) sum += line.amount;",
				before: 14,
			},
			{ kind: "added", text: "  for (const line of lines) {", after: 14 },
			{
				kind: "added",
				text: "    sum += Math.round(line.amount * line.quantity * 100) / 100; // cents, not floats",
				after: 15,
			},
			{ kind: "added", text: "  }", after: 16 },
			{
				kind: "context",
				text: "  const tax = sum * invoice.taxRate;",
				before: 15,
				after: 17,
			},
			{
				kind: "context",
				text: "  return { sum, tax, total: sum + tax };",
				before: 16,
				after: 18,
			},
			{ kind: "context", text: "}", before: 17, after: 19 },
		],
	},
	{
		header: "@@ -41,6 +43,6 @@ export function due(invoice: Invoice)",
		lines: [
			{
				kind: "context",
				text: "  const issued = new Date(invoice.issuedAt);",
				before: 41,
				after: 43,
			},
			{
				kind: "removed",
				text: "  issued.setDate(issued.getDate() + 30);",
				before: 42,
			},
			{
				kind: "added",
				text: "  issued.setDate(issued.getDate() + invoice.terms.days);",
				after: 44,
			},
			{ kind: "context", text: "  return issued;", before: 43, after: 45 },
			{ kind: "context", text: "}", before: 44, after: 46 },
		],
	},
];

// Board 51's terms.ts, a new file, diffed from its two texts.
const TERMS = `export interface Terms {
  days: number;
  label: string;
}

export const NET_30: Terms = { days: 30, label: "Net 30" };
export const NET_60: Terms = { days: 60, label: "Net 60" };
`;

const BEFORE =
	"Invoices are due 30 days after they are issued. Late invoices are flagged in the billing list, and the customer receives a reminder by email. A reminder goes out once; nobody is charged a late fee automatically.";
const AFTER =
	"Invoices are due on the customer's payment terms, 30 days by default. Late invoices are flagged in the billing list, and the customer receives a reminder by email and in the app. A reminder goes out on the day it is due and again a week later; nobody is charged a late fee automatically.";

// Board 51's edited description, diffed by word in its Section.
function Edited(props: { painted?: boolean }) {
	return (
		<Section title="Description" description="Edited by Ana Ruiz, 2 h ago">
			<Diff
				label="Description"
				by="word"
				before={props.painted ? waitingText : BEFORE}
				after={props.painted ? waitingText : AFTER}
			/>
		</Section>
	);
}

// The added class set draws the new file; every other rest class set the invoice. The
// paint class set draws the invoice beside its painted diff, the loading state the
// painted diff alone; each also draws the description diffed by word. The empty and error states, on the first class set, draw the
// diff over hunks that arrive as none, fail and answer not found, in Sections
// that hold none of them: the diff draws its own form.
export function drawDiff(scene: ShowcaseScene) {
	if (scene.state === "empty" || scene.state === "error")
		return isFirstClassSet(scene) ? (
			<Wide>
				{endedAt<Hunk>(scene.id, scene.state).map(({ title, items }) => (
					<Section key={title} title={title}>
						<Diff label={`src/billing/${title}.ts`} hunks={items} />
					</Section>
				))}
			</Wide>
		) : undefined;
	const painted = (
		<Diff
			label="src/billing/invoice.ts"
			before={waitingText}
			after={waitingText}
		/>
	);
	if (isPaint(scene))
		return scene.state === "rest" ? (
			<Wide>
				<Diff label="src/billing/invoice.ts" hunks={INVOICE} />
				{painted}
				<Edited />
				<Edited painted />
			</Wide>
		) : undefined;
	if (scene.state === "loading")
		return (
			<Wide>
				{painted}
				<Edited painted />
			</Wide>
		);
	return (
		<Wide>
			{scene.classSet.name === "DIFF_LINE.kind.added" ? (
				<Diff label="src/billing/terms.ts" before="" after={TERMS} />
			) : (
				<Diff label="src/billing/invoice.ts" hunks={INVOICE} />
			)}
			<Edited />
		</Wide>
	);
}
