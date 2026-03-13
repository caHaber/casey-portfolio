// Cool palette stops from d3-scale-chromatic.
const STOPS: [number, number, number][] = [
	[0x6e, 0x40, 0xaa], // #6e40aa — purple
	[0xbf, 0x3c, 0xaf], // #bf3caf — pink-purple
	[0xfe, 0x4b, 0x83], // #fe4b83 — pink
	[0xff, 0x78, 0x47], // #ff7847 — orange
	[0xe2, 0xb7, 0x2f], // #e2b72f — yellow
	[0xaf, 0xf0, 0x5b] //  #aff05b — yellow-green
];


/** Maps t ∈ [0, 1] to an [r, g, b] tuple using the cool palette. */
export function interpolateCoolRGB(t: number): [number, number, number] {
	const clamped = Math.max(0, Math.min(1, t));
	const n = STOPS.length - 1;
	const scaled = clamped * n;
	const i = Math.min(Math.floor(scaled), n - 1);
	const f = scaled - i;
	const [ar, ag, ab] = STOPS[i];
	const [br, bg, bb] = STOPS[i + 1];
	return [
		Math.round(ar + (br - ar) * f),
		Math.round(ag + (bg - ag) * f),
		Math.round(ab + (bb - ab) * f)
	];
}

/** Maps t ∈ [0, 1] to a CSS rgb() string. */
export function interpolateCool(t: number): string {
	const [r, g, b] = interpolateCoolRGB(t);
	return `rgb(${r},${g},${b})`;
}
