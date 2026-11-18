// A density's sizes, as the showcase measures them: the gap and the pad, the
// page inset, a control (a glyph), a card one line and two lines high, an edge
// chip's height, a group head and a port.
export interface Density {
	touch: boolean;
	pair: number;
	pad: number;
	page: number;
	control: number;
	card: number;
	tall: number;
	chip: number;
	head: number;
	port: number;
}

export const DESKTOP: Density = {
	touch: false,
	pair: 6,
	pad: 12,
	page: 24,
	control: 28,
	card: 70,
	tall: 88,
	chip: 30,
	head: 32,
	port: 12,
};

export const TOUCH: Density = {
	touch: true,
	pair: 8,
	pad: 16,
	page: 16,
	control: 44,
	card: 86,
	tall: 108,
	chip: 38,
	head: 44,
	port: 12,
};
