import { createFileRoute } from "@tanstack/react-router";
import { Tv } from "../../screens/tv.tsx";

export const Route = createFileRoute("/tv")({
	component: Tv,
});
