import { Banner } from "@slotform/react-ui/components/banner";
import { Gate } from "@slotform/react-ui/components/gate";
import { Section } from "@slotform/react-ui/components/section";
import { type AppLockup, LockupProvider } from "@slotform/react-ui/lib/lockup";
import { toast } from "@slotform/react-ui/lib/toast";
import type { Confirmation } from "@slotform/ui-core/descriptors";
import { confirm } from "@slotform/ui-core/react/confirm";
import { text } from "@slotform/ui-core/variants";
import type { ShowcaseScene } from "../class-sets.ts";
import { readsAt } from "../waiting.ts";
import { FILLED, GIVEN_BUT_KIND, KIND, SAVED } from "./form-fixtures.tsx";
import { StandInCard } from "./layout-context.tsx";
import { MARK } from "./lockup.ts";
import { act } from "./section-rows.ts";

// A logo that fails to load: the name stands alone.
const BROKEN: AppLockup = { src: "data:image/svg+xml,<", name: MARK.name };

// The scene draws the page as the Shell's scenes draw theirs, a viewport tall.
const BOX = "flex flex-col gap-gap";

// The class sets that add a case to the gate, and what each adds.
const FAILED_LOGO = "TEXT_STRONG.role.body";
const RAISES = "TEXT.role.meta";
const LABELLED_PICKS = "TEXT.role.title";
const CASES: Record<string, string> = {
	[FAILED_LOGO]: "a mark whose logo fails: its name alone",
	[RAISES]: "toast() and confirm() from inside the gate",
	[LABELLED_PICKS]:
		"labelled picks in the gate's cards, loaded, painted and failed",
};

// The decision the raising case asks; its act tells once its work resolves,
// as the layouts' do.
export const DISCONNECT: Confirmation = {
	title: "Disconnect Acme?",
	sentence:
		"Its deploys stop reading from this workspace until you connect it again.",
	act: {
		label: "Disconnect",
		destructive: true,
		onAct: async () => toast("Acme disconnected"),
	},
};

// The two acts of the raising case, buttons in the body: one tells, one asks.
const remind = () => toast("We will ask again tomorrow.");
const disconnect = () => confirm(DISCONNECT);

// A consent step's cards of labelled picks: an organization whose name is long
// and a comparison whose label wraps, once with their options loaded, once
// painted while the options wait and once failed. In the gate's column the
// rows stand at the narrowest width a page gives them, so each pick keeps its
// label and its value on the row's one line, its failed shape the failed row's
// mark and retry icon at the row's end, never past the card.
const PICK_ORGS = ["Northwind Outfitters", "Contoso Trading"] as const;
const PICK_AGAINST = ["Production", "Release 14 preview"] as const;
function Picks(props: { id: string }) {
	const reads = readsAt(`${props.id}/picks`);
	const card = (title: string, read: typeof reads.ready) => (
		<Section
			title={title}
			items={[
				{
					label: "Organization",
					pick: {
						label: "Organization",
						value: PICK_ORGS[0],
						onChange: act,
						options: read.at(() =>
							PICK_ORGS.map((value) => ({ value, label: value })),
						),
					},
				},
				{
					label: "Compared against",
					pick: {
						label: "Compared against",
						value: "preview",
						onChange: act,
						options: read.at(() => [
							{ value: "production", label: PICK_AGAINST[0] },
							{ value: "preview", label: PICK_AGAINST[1] },
						]),
					},
				},
			]}
		/>
	);
	return (
		<>
			{card("Loaded", reads.ready)}
			{card("Painted", reads.waiting)}
			{card("Failed", reads.failing)}
		</>
	);
}

// The title class set draws the whole gate: its banner, mark, step count, head and
// a body of rows over a form of one pick and its bar, none of it a typing
// control, so nothing takes focus on the scenes page. The strong body class set draws it with a logo that
// fails (the name draws in that class set), the meta class set with acts that
// raise a toast and a decision, which the gate's own host draws.
export function drawGate(scene: ShowcaseScene) {
	const classSet = scene.classSet.name;
	const raises = classSet === RAISES;
	const named = classSet === FAILED_LOGO;
	const note = CASES[classSet];
	return (
		<div className={BOX}>
			{note ? <p className={text({ role: "caption" })}>{note}</p> : null}
			<LockupProvider lockup={named ? BROKEN : MARK}>
				<Gate
					step={{ at: 1, of: 2 }}
					title="Choose a workspace"
					description={["Signed in as ", { strong: "ana@acme.dev" }]}
					banner={
						<Banner tone="attention" sentence="This request has expired." />
					}
					form={{
						act: SAVED,
						given: GIVEN_BUT_KIND,
						values: { kind: FILLED.kind },
						fields: { kind: KIND },
						submit: { label: "Continue" },
						acts: raises
							? [
									{ label: "Disconnect", destructive: true, onAct: disconnect },
									{ label: "Remind me later", onAct: remind },
								]
							: undefined,
					}}
				>
					<StandInCard />
					{classSet === LABELLED_PICKS ? <Picks id={scene.id} /> : null}
				</Gate>
			</LockupProvider>
		</div>
	);
}
