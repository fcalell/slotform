import { useMutation } from "@fcalell/plugin-query/tanstack-query";
import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Table } from "@fcalell/plugin-react-ui/components/table";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import type { Picked, TableColumn } from "@fcalell/ui-core/descriptors";
import { useWindow } from "@fcalell/ui-core/react/read";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { AppRouter } from "../../../../.stack/worker";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/requests")({
	component: Requests,
});

type Request = AppRouter["requests"]["list"]["__output"]["data"][number];
type Query = { q?: string | undefined };

// The requests table's columns: docs/architecture/ui-core/components.md, "In the showcase".
const COLUMNS: TableColumn<Request>[] = [
	{
		key: "path",
		label: "Path",
		width: "1/4",
		sortable: true,
		cell: (request) => `${request.method} ${request.path}`,
	},
	{
		key: "state",
		label: "Outcome",
		kind: "status",
		width: "measure-short",
		cell: (request) => ({ tone: request.state }),
	},
	{
		key: "took",
		label: "Took (ms)",
		kind: "number",
		sortable: true,
		cell: (request) => request.took,
	},
	{
		key: "at",
		label: "Served",
		kind: "age",
		sortable: true,
		cell: (request) => request.at,
	},
	{
		key: "method",
		label: "Method",
		hidden: true,
		cell: (request) => request.method,
	},
	{
		key: "id",
		label: "Request",
		kind: "source",
		hidden: true,
		cell: (request) => request.id,
	},
];

const ROW = { id: (request: Request) => request.id };

// Every request the deploys served, windowed: docs/architecture/ui-core/components.md, "In the showcase".
function Requests() {
	const [q, setQ] = useState("");
	const [picked, setPicked] = useState<Picked<Query>>({ ids: [] });
	const remove = useMutation(orpc.requests.remove.mutationOptions());
	const requests = orpc.requests.list.window(q ? { q } : {});
	// The count the foot's selection bar says: the ids ticked, or the query's
	// rows less those unticked, out of every row the filter matches.
	const total = useWindow(requests)?.total ?? 0;
	const count =
		"ids" in picked
			? picked.ids.length
			: Math.max(0, total - picked.except.length);
	const query: Query = q ? { q } : {};
	return (
		<Pane
			foot={
				<ActionBar
					chosen={{
						count,
						of: total,
						noun: "requests",
						onAll: (all) =>
							setPicked(all ? { query, except: [] } : { ids: [] }),
					}}
					acts={[
						{
							label: "Delete",
							destructive: true,
							blocked: count === 0 ? "Choose requests to delete." : undefined,
							confirm: {
								title: "Delete the chosen requests?",
								sentence: "Their logs go with them.",
							},
							onAct: () => remove.mutateAsync({ requests: picked }),
							done: "Requests deleted",
						},
					]}
				/>
			}
		>
			<Toolbar search={{ value: q, onChange: setQ }} />
			<Table
				columns={COLUMNS}
				items={requests}
				row={ROW}
				choose={{ picked, onPick: setPicked }}
				empty={
					q
						? {
								sentence: `No request matches "${q}".`,
								act: { label: "Clear search", onAct: () => setQ("") },
							}
						: {
								sentence: "No requests served yet.",
								act: { label: "Open deploys", href: "/deploys" },
							}
				}
			/>
		</Pane>
	);
}
