import { read } from "@fcalell/plugin-query/read";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { createFileRoute } from "@tanstack/react-router";
import { act } from "../../lib/act.ts";

export const Route = createFileRoute("/_app/logs")({
	component: Logs,
});

// The logs of every deploy: none has served a request yet.
const logs = read({
	queryKey: ["logs"],
	queryFn: () => Promise.resolve<readonly string[]>([]),
	staleTime: Number.POSITIVE_INFINITY,
});

function Logs() {
	return (
		<Pane
			read={logs}
			empty={{
				sentence: "Logs stream here once a deploy serves its first request.",
				act: { label: "Deploy", onAct: act },
			}}
		/>
	);
}
