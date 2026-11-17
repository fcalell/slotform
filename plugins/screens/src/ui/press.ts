import type { ControlPoint } from "./page.ts";

// A press of a control by its text: docs/architecture/plugins/screens.md,
// "A press". DOM-free, so the test run and `shoot`/`drive` share it; each
// supplies the steps that reach its page.

// Each try's wait before it and the alignment it scrolls the control to, so a
// fixed bar over the control at one is clear of it at another.
export const TRIES: readonly { wait: number; align: ScrollLogicalPosition }[] =
	[
		{ wait: 0, align: "center" },
		{ wait: 50, align: "start" },
		{ wait: 100, align: "end" },
	];

export interface PressSteps {
	// Finds and scrolls the control, hit-tests its point, and arms the second
	// hit test when the point is clear (`aim` in page.ts).
	aim(align: ScrollLogicalPosition): Promise<ControlPoint | null>;
	click(x: number, y: number): Promise<void>;
	// What the press's first trusted event hit instead of the control, or null.
	landed(): Promise<string | null>;
}

// Presses the control named `text`: the failure line when no try landed,
// naming what the last try met; undefined when one landed.
export async function press(
	steps: PressSteps,
	text: string,
): Promise<string | undefined> {
	let miss = "";
	for (const { wait, align } of TRIES) {
		await new Promise((resolve) => setTimeout(resolve, wait));
		const point = await steps.aim(align);
		if (!point) {
			miss = `no control named "${text}"`;
			continue;
		}
		let cover = point.cover;
		if (cover === null) {
			await steps.click(point.x, point.y);
			cover = await steps.landed();
			if (cover === null) return undefined;
		}
		miss = `"${point.label}" is covered by ${cover} at ${Math.round(point.x)},${Math.round(point.y)}`;
	}
	return `${miss} (${TRIES.length} tries)`;
}
