import { type ReactNode, useContext } from "react";
import { DistanceContext, ShellSwitcher, ShellTabs } from "../../lib/frame";
import { FadingView, placeIn } from "../../lib/motion";
import { RoomScope } from "../../lib/room";

const PLACE = "flex-1";

// The Shell's content holds a place: docs/architecture/ui-core/layout.md, "Place".
// `distance` `room` draws the room set and the touch structure; the Shell draws the place at its own distance.
export function Place(props: { distance?: "room"; children?: ReactNode }) {
	const far = props.distance === "room";
	const tabs = useContext(ShellTabs);
	const switcher = useContext(ShellSwitcher);
	// The room set has no place to switch from: its Pane gets no trigger.
	const page = (
		<DistanceContext.Provider value={far}>
			<ShellSwitcher.Provider value={far ? undefined : switcher}>
				<FadingView entering={placeIn()} className={PLACE}>
					{props.children}
					{tabs}
				</FadingView>
			</ShellSwitcher.Provider>
		</DistanceContext.Provider>
	);
	return far ? <RoomScope>{page}</RoomScope> : page;
}
