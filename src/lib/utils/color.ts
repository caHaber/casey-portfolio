// Medium-blue palette for warm beige background: readable but not too dark.
const STOPS: [number, number, number][] = [
	[0x2b, 0x5c, 0x8a], // #2b5c8a — medium navy
	[0x3a, 0x7c, 0xa5], // #3a7ca5 — steel blue
	[0x35, 0x8b, 0x9e], // #358b9e — teal
	[0x48, 0x96, 0xaa], // #4896aa — ocean
	[0x2e, 0x72, 0x8f], // #2e728f — blue teal
	[0x3d, 0x68, 0x87] // #3d6887 — slate blue
];

/** Maps t ∈ [0, 1] to an [r, g, b] tuple using the ocean palette. */
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

/** Maps t ∈ [0, 1] to a CSS rgb() string using the ocean palette. */
export function interpolateCool(t: number): string {
	const [r, g, b] = interpolateCoolRGB(t);
	return `rgb(${r},${g},${b})`;
}
