// What the container molecules hand each other on both platforms.
import { createContext } from "react";
import type { LinkAct } from "../descriptors.ts";

// The way to the first of the Shell's places that is an address of the app:
// where the page for an address nothing serves leads. `undefined` outside a
// Shell, which is how that page knows whether it stands in one.
export const ShellHome = createContext<LinkAct | undefined>(undefined);
