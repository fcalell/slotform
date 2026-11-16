// A blocked act's reason, where it draws and whether its press stands (the
// model is `../reason.ts`).
import { createContext, useCallback, useState } from "react";
import { pressStands } from "../reason.ts";

// Where a blocked act's reason draws when not under the act: a molecule that
// keeps its row still (an ActionBar's acts, a Section's head, a sheet's head, a
// pending bar) draws the reason on its own line and hands the act its press.
// The act calls it when pressed while blocked; the host shows the reason from
// then on, or once its form is touched.
export const ReasonHostContext = createContext<(() => void) | undefined>(
	undefined,
);

// A blocked act's press (`../reason.ts`): whether it stands under `blocked`,
// and the press that keeps it. Unblocking or a new reason forgets it in render.
export function usePressed(
	blocked: string | undefined,
): [pressed: boolean, press: () => void] {
	const [under, setUnder] = useState<string>();
	const press = useCallback(() => setUnder(blocked), [blocked]);
	return [pressStands(blocked, under), press];
}
