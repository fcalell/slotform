import { createFileRoute } from "@tanstack/react-router";
import { TvOffline } from "../../screens/tv.tsx";

export const Route = createFileRoute("/tv-offline")({
	component: TvOffline,
});
