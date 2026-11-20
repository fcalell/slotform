import { Pane } from "@slotform/native-ui/components/pane";
import { Section } from "@slotform/native-ui/components/section";
import { Sheet } from "@slotform/native-ui/components/sheet";
import { age } from "@slotform/native-ui/lib/age";
import { preload as start } from "@slotform/query/preload";
import { useMutation } from "@slotform/query/tanstack-query";
import { confirm } from "@slotform/ui-core/react/confirm";
import type { QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { orpc } from "../lib/api";

// The one read the screen draws, built here so the route's `preload` and the
// screen make the same query.
const notesRead = () => orpc.notes.list.read();

// A press on a link to this route starts the read before the push mounts it.
export const preload = (client: QueryClient) => start(client, notesRead());

export default function Notes() {
	const notes = notesRead();
	const remove = useMutation(orpc.notes.remove.mutationOptions());
	const [open, setOpen] = useState(false);
	const ask = (note: { id: string; title: string }) =>
		confirm({
			title: "Delete note",
			sentence: `“${note.title}” will be gone for good.`,
			act: {
				label: "Delete",
				destructive: true,
				onAct: () => remove.mutateAsync({ id: note.id }),
			},
		});
	return (
		<Pane
			acts={[{ icon: "Plus", label: "New note", onAct: () => setOpen(true) }]}
		>
			<Section
				title="Recent"
				items={notes.at((rows) =>
					rows.map((note) => ({
						key: note.id,
						title: note.title,
						facts: [age(note.createdAt.toISOString())],
						more: [
							{
								label: "Delete",
								icon: "Trash2",
								destructive: true,
								onAct: () => ask(note),
							},
						],
					})),
				)}
				empty={{ sentence: "No notes yet." }}
			/>
			<Sheet
				open={open}
				onClose={() => setOpen(false)}
				title="New note"
				form={{
					act: orpc.notes.create,
					fields: { title: { label: "Title" } },
					submit: { label: "Add" },
					onDone: () => setOpen(false),
				}}
			/>
		</Pane>
	);
}
