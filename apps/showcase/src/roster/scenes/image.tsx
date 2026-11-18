import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Image } from "@fcalell/plugin-react-ui/components/image";
import type { ImageFit, ImageState } from "@fcalell/ui-core/variants";
import type { ShowcaseScene } from "../class-sets.ts";
import { waitingText } from "../waiting.ts";
import { press, Stage } from "./overlay-stage.tsx";
import { isPaint } from "./painted.tsx";
import { BROKEN, SCREEN } from "./pictures.ts";
import { Standing } from "./track.tsx";

// The captured page's width over its height.
const SCREEN_ASPECT = 1280 / 800;
// A square code, the edge a column wider than the height cap draws: its box
// narrows to the cap rather than cropping the code to it.
const CODE = `data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" width="420" height="420" shape-rendering="crispEdges"><rect width="21" height="21" fill="#fff"/><path d="M0 0h7v7H0zM14 0h7v7h-7zM0 14h7v7H0z" fill="#111"/><path d="M1 1h5v5H1zM15 1h5v5h-5zM1 15h5v5H1z" fill="#fff"/><path d="M2 2h3v3H2zM16 2h3v3h-3zM2 16h3v3H2zM9 1h2v2H9zM8 4h3v2H8zM10 8h3v3h-3zM14 9h2v4h-2zM17 10h3v2h-3zM8 14h2v3H8zM12 13h3v2h-3zM15 16h4v3h-4zM10 18h3v2h-3z" fill="#111"/></svg>',
)}`;
const CODE_ALT = "Code that adds a device";
const ALT = "Checkout page after the failed payment";
// The content fit stands at its container's width, the pictures a gap apart.
const COLUMN = "flex w-dialog max-w-full flex-col gap-gap";

function drawn(fit: ImageFit, state: ShowcaseScene["state"]) {
	const src = state === "error" ? BROKEN : SCREEN;
	// The address a read has not answered: the tile paints.
	const shown = state === "loading" ? waitingText : src;
	if (fit === "thumb") return <Image src={shown} alt={ALT} fit="thumb" />;
	// The mini tile is the dock's: a picture to look at, which presses nothing,
	// drawn in the dock of a loaded track. A track's picture is an address, never
	// a read, so the mini tile has no painted shape.
	if (fit === "mini")
		return state === "loading" ? undefined : <Standing image={src} />;
	const code = state === "rest" ? CODE : shown;
	return (
		<div className={COLUMN}>
			<Image src={shown} alt={ALT} aspect={SCREEN_ASPECT} />
			<Image src={code} alt={CODE_ALT} aspect={1} />
		</div>
	);
}

const pressPicture = (stage: HTMLElement) =>
	requestAnimationFrame(() => press(stage.querySelector("button")));

// `IMAGE.fit.<fit>` draws the picture at that fit in the scene's state
// (`loading` the painted tile, `error` the failed shape); `IMAGE.state.<state>` both fits in that state and
// `IMAGE_PICTURE.fit.<fit>` the picture alone (the mini fit in a dock). The
// Close act's class set (`ICON_BUTTON.fit.body`) draws the full view opened from a
// thumbnail in a Gate, contain-fit on the scrim.
export function drawImage(scene: ShowcaseScene) {
	const [matrixGroup, axis, value] = scene.classSet.name.split(".");
	if (isPaint(scene))
		return scene.state === "rest" ? (
			<>
				{drawn("thumb", "loading")}
				{drawn("content", "loading")}
			</>
		) : undefined;
	if (matrixGroup === "ICON_BUTTON" && scene.state === "rest")
		return (
			<Stage contain ready={pressPicture}>
				<Gate title="Screenshots">
					<Image src={SCREEN} alt={ALT} fit="thumb" />
				</Gate>
			</Stage>
		);
	// The class set's name is `<matrix group>.<axis>.<value>` over the matrices' own
	// axis values, so the value is an `ImageFit` or an image state.
	if (
		axis === "fit" &&
		(matrixGroup === "IMAGE" || matrixGroup === "IMAGE_PICTURE")
	)
		return drawn(
			value as ImageFit,
			matrixGroup === "IMAGE" ? scene.state : "rest",
		);
	if (matrixGroup === "IMAGE" && axis === "state")
		return (
			<>
				{drawn("thumb", value as ImageState)}
				{drawn("content", value as ImageState)}
			</>
		);
	return undefined;
}
