import { Code } from "@slotform/react-ui/components/code";
import { Form } from "@slotform/react-ui/components/form";
import { Pane } from "@slotform/react-ui/components/pane";
import { Section } from "@slotform/react-ui/components/section";
import { Text } from "@slotform/react-ui/components/text";
import { useDrawsFailure, useSelections } from "@slotform/ui-core/react/read";
import { isEnded } from "@slotform/ui-core/read";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/keys")({
	component: Keys,
});

const SCOPES = [
	{ value: "read", label: "Read", description: "Lists deploys and usage" },
	{ value: "write", label: "Write", description: "Starts and cancels deploys" },
	{
		value: "admin",
		label: "Admin",
		description: "Manages members and billing",
	},
] as const;

type Draft = {
	name?: string;
	scope?: "read" | "write" | "admin";
	token?: string;
};

// A new API key, its `after` a read drawn from the fields' input: docs/architecture/ui-core/acts.md, "Forms".
function Preview({ draft }: { draft: Draft }) {
	// The preview asks for the token's length, never the token: a secret stays
	// out of a read's address.
	const preview = orpc.keys.preview.read({
		name: draft.name,
		scope: draft.scope,
		tokenLength: draft.token?.length,
	});
	// A read that ended or answered nothing says so (it draws its own failure): the form's `after` is a
	// block, and a block that draws nothing would only reserve room.
	const [drawn] = useSelections([preview]);
	useDrawsFailure([preview]);
	const said = drawn.painted ? isEnded(drawn.phase) : drawn.value.length === 0;
	if (said) return <Text kind="meta">Nothing to send yet.</Text>;
	return (
		<Code
			text={preview.at((facts) =>
				facts.map((fact) => `${fact.label}: ${fact.value}`).join("\n"),
			)}
		/>
	);
}

function Keys() {
	return (
		<Pane>
			<Section
				title="New key"
				description="A key reads the API as the member who made it."
			>
				<Form
					act={orpc.keys.create}
					values={{ scope: "read" }}
					fields={{
						name: { label: "Name" },
						scope: { label: "Scope", options: SCOPES },
						token: {
							label: "Token",
							control: "secret",
							description: "Shown once; paste it where it is used.",
						},
						expires: {
							label: "Expires",
							options: [
								{ value: "day", label: "In a day" },
								{ value: "month", label: "In a month" },
								{ value: "year", label: "In a year" },
							],
							empty: "Never",
						},
						note: { label: "Note", control: "prose" },
					}}
					submit={{ label: "Create key", done: "Key created" }}
					after={(input) => <Preview draft={input} />}
				/>
			</Section>
		</Pane>
	);
}
