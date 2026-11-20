import { preload } from "@slotform/query/preload";
import { Pane } from "@slotform/react-ui/components/pane";
import { Section } from "@slotform/react-ui/components/section";
import { toast } from "@slotform/react-ui/lib/toast";
import { createFileRoute } from "@tanstack/react-router";
import { act } from "../../../lib/act.ts";
import { orpc } from "../../../lib/api.ts";

export const Route = createFileRoute("/_app/domains/")({
	loader: ({ context }) =>
		preload(context.queryClient, orpc.domains.list.read()),
	component: Domains,
});

// A list of the domains. A row opens nothing: no record route stands behind it.
function Domains() {
	const domains = orpc.domains.list.read();
	return (
		<Pane
			acts={[{ icon: "Plus", label: "Add domain", onAct: act }]}
			read={domains}
			empty={{ sentence: "No domain is connected." }}
		>
			<Section
				items={domains.at((rows) =>
					rows.map((domain) => ({
						key: domain.name,
						title: domain.name,
						// The state is said nowhere else, so it is a status fact.
						facts: [{ tone: domain.state }, ...domain.meta.split(" · ")],
						href: `#${domain.name}`,
						// Only a domain still waiting has a record to verify.
						more: [
							...(domain.state === "waiting"
								? [
										{
											label: "Verify",
											icon: "ShieldCheck" as const,
											href: "/domains/verify" as const,
										},
									]
								: []),
							{
								label: "Copy name",
								icon: "Copy" as const,
								onAct: () => toast("Name copied"),
							},
						],
					})),
				)}
			/>
		</Pane>
	);
}
