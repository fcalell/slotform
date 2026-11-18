import { createContext } from "react";
import { NOOP } from "./noop.ts";

// Where a popup mounts: docs/architecture/plugins/react-ui.md, "Popups".
export const PortalContainer = createContext<HTMLElement | null | undefined>(
	undefined,
);

// How the container's `main` hands its portal element to the container host, which
// names it for every popup under it.
export const PortalRegion =
	createContext<(node: HTMLElement | null) => void>(NOOP);
