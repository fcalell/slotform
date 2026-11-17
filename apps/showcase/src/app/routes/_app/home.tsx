import { preload } from "@fcalell/plugin-query/preload";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Composer, Thread } from "@fcalell/plugin-react-ui/components/thread";
import { useTouch } from "@fcalell/plugin-react-ui/lib/media";
import { navigate } from "@fcalell/plugin-react-ui/lib/navigate";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/home")({
	loader: ({ context }) => preload(context.queryClient, orpc.tasks.list.read()),
	component: Home,
});

const LATEST = [
	{
		id: "l1",
		author: "you" as const,
		body: "How much of the plan is used this month?",
	},
	{
		id: "l2",
		author: "other" as const,
		body: "`acme-web` serves 412,000 requests this month, 41 % of the Team plan.",
	},
];

const NAME = { you: "You", other: "Assistant" } as const;

// An assistant's home, its ask field docked at the Pane's foot on touch: docs/architecture/ui-core/layout.md, "Foot".
function Home() {
	const tasks = orpc.tasks.list.read();
	const touch = useTouch();
	const [value, setValue] = useState("");
	const [reading, setReading] = useState<string | null>("production");
	const composer = {
		value,
		onChange: setValue,
		placeholder: "Ask about your deploys",
		onSend: () => navigate("/assistant"),
	};
	return (
		<Pane
			fill
			context={{
				label: "Reading context",
				value: reading,
				onChange: setReading,
				options: [
					{ value: "production", label: "Production" },
					{
						value: "preview",
						label: "Release 14 preview",
						chip: { family: "amber", label: "Preview" },
					},
				],
			}}
			foot={touch ? <Composer {...composer} /> : undefined}
		>
			<Section
				title="Tasks"
				items={tasks.at((rows) =>
					rows.map((task) => ({
						key: task.id,
						title: task.title,
						facts: [task.meta],
					})),
				)}
				empty={{
					sentence: tasks.at(() => "No task is open."),
				}}
			/>
			<Section title="Latest">
				<Thread
					items={LATEST}
					message={{
						key: (turn) => turn.id,
						author: (turn) => turn.author,
						name: (turn) => NAME[turn.author],
						body: (turn) => turn.body,
					}}
					composer={touch ? undefined : composer}
				/>
			</Section>
		</Pane>
	);
}
