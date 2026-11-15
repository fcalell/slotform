import { createFileRoute } from "@tanstack/react-router";
import { Foundations } from "../../screens/foundations.tsx";

export const Route = createFileRoute("/foundations")({
	component: Foundations,
});
