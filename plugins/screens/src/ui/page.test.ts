import assert from "node:assert/strict";
import { test } from "node:test";
import { pressPoint } from "./page.ts";

const rect = (left: number, top: number, right: number, bottom: number) => ({
	left,
	top,
	right,
	bottom,
});

test("a link wrapped over two lines is pressed on its first line, not between them", () => {
	// The line ends at the right edge and the next starts at the left: the box
	// around both covers the neighbouring text.
	const first = rect(200, 100, 320, 120);
	const second = rect(0, 124, 60, 144);
	const box = rect(0, 100, 320, 144);
	assert.deepEqual(pressPoint(box, [first, second], 320, 600), {
		x: 260,
		y: 110,
	});
});

test("a control taller than the viewport is pressed inside the viewport", () => {
	const tall = rect(0, -500, 300, 1500);
	assert.deepEqual(pressPoint(tall, [tall], 320, 600), { x: 150, y: 300 });
});

test("a line showing under a pixel of itself in the viewport is passed over", () => {
	const sliver = rect(0, 599.5, 1.5, 620);
	const next = rect(0, 10, 100, 30);
	assert.deepEqual(
		pressPoint(rect(0, 10, 100, 620), [sliver, next], 320, 600),
		{
			x: 50,
			y: 20,
		},
	);
});

test("with no line in the viewport, the box's middle, where nothing of it is drawn", () => {
	const away = rect(400, 0, 500, 20);
	assert.deepEqual(pressPoint(away, [away], 320, 600), { x: 450, y: 10 });
});
