// What a field hands the controls and acts inside it on both platforms.
import { createContext } from "react";

// A field hands its disabled state to what stands inside it: docs/architecture/ui-core/acts.md, "Fields".
export const FieldDisabled = createContext(false);

// Set by an owner that names the controls standing in it: docs/architecture/ui-core/acts.md, "Fields".
export const FieldOwned = createContext(false);
