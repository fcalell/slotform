import type { ShowcaseScene } from "../class-sets.ts";
import { BROKEN, SCREEN } from "./pictures.ts";
import { Standing } from "./track.tsx";

// The dock under a place's column with a track loaded: `rest` paused with no
// picture (the tile's failed shape holds the name's place), `error` told to play
// and failed. The picture's class set (`IMAGE.fit.mini`) draws it with a picture, and
// in `error` with an address that is no picture. The other class sets are drawn
// inside these.
export function drawDock(scene: ShowcaseScene) {
	const failing = scene.state === "error";
	if (scene.classSet.name === "DOCK") return <Standing failing={failing} />;
	if (scene.classSet.name === "IMAGE.fit.mini")
		return <Standing image={failing ? BROKEN : SCREEN} />;
	return undefined;
}
