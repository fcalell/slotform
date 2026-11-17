import { createContext } from "react";

// Where a popup mounts: docs/architecture/plugins/react-ui.md, "Popups".
export const PortalContainer = createContext<HTMLElement | null | undefined>(
	undefined,
);

// How the frame's `main` hands its portal element to the frame host, which
// names it for every popup under it.
export const PortalSlot = createContext<(node: HTMLElement | null) => void>(
	() => {},
);
