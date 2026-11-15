// What a field hands the controls and acts inside it on both platforms.
import { createContext } from "react";

// Whether the field around an act or a control is disabled: the field hands
// its state to what stands inside it through this one, and a disabled control
// answers no press.
export const FieldDisabled = createContext(false);

// Set by an owner that names the controls standing in it (a `FormField`'s
// children, a `Toolbar`'s acts): a control there draws no field of its own,
// its `label` only its accessible name. Anywhere else a control placed alone
// draws its field (`FieldBody` with `alone`).
export const FieldOwned = createContext(false);
