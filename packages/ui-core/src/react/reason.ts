// A blocked act's reason, where it draws and whether its press stands (the
// model is `../reason.ts`).
import { createContext, useCallback, useState } from "react";
import { pressStands } from "../reason.ts";
import { useTouched } from "./touched.ts";

// Where a blocked act's reason draws when not under the act: docs/architecture/ui-core/acts.md, "Blocked reasons".
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

// A blocked act's reason drawn on its host's own line, so the act keeps its
// place: the act is handed the `host`, and the `reason` is the blocked sentence
// once the act was pressed while blocked, or its form is touched, else none.
export function useReasonShown(blocked: string | undefined): {
	host: (() => void) | undefined;
	reason: string | undefined;
} {
	const { touched } = useTouched();
	const [pressed, press] = usePressed(blocked);
	return {
		host: blocked === undefined ? undefined : press,
		reason: pressed || touched ? blocked : undefined,
	};
}
