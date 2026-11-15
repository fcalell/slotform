import { createFileRoute } from "@tanstack/react-router";
import { TvBoard } from "../../screens/tv.tsx";

export const Route = createFileRoute("/tv-board")({
	component: TvBoard,
});
