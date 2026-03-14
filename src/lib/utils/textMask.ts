interface Point {
	x: number;
	y: number;
}

/**
 * Rasterizes `text` centered at (centerX, centerY) with an explicit fontSize
 * and returns up to `maxSamples` pixel coordinates inside the text glyphs.
 */
export function getTextPixelsAt(
	text: string,
	centerX: number,
	centerY: number,
	fontSize: number,
	canvasWidth: number,
	canvasHeight: number,
	maxSamples = 3000
): Point[] {
	const canvas = document.createElement('canvas');
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;
	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, canvasWidth, canvasHeight);
	ctx.font = `100 ${fontSize}px system-ui, -apple-system, sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = '#fff';
	ctx.fillText(text, centerX, centerY);

	const { data } = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
	const pixels: Point[] = [];

	for (let y = 0; y < canvasHeight; y++) {
		for (let x = 0; x < canvasWidth; x++) {
			if (data[(y * canvasWidth + x) * 4] > 128) {
				pixels.push({ x, y });
			}
		}
	}

	if (pixels.length <= maxSamples) return pixels;
	const step = pixels.length / maxSamples;
	return Array.from({ length: maxSamples }, (_, i) => pixels[Math.floor(i * step)]);
}

/**
 * Rasterizes `text` on a hidden canvas and returns up to `maxSamples`
 * pixel coordinates that fall inside the text glyphs.
 */
export function getTextPixels(
	text: string,
	canvasWidth: number,
	canvasHeight: number,
	maxSamples = 60000
): Point[] {
	const canvas = document.createElement('canvas');
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;

	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, canvasWidth, canvasHeight);

	// Size the text so it fits within ~65% of canvas width (measureText accounts for weight 900)
	const maxTextWidth = canvasWidth * 0.65;
	let fontSize = Math.floor((canvasWidth * 0.65) / (text.length * 0.55));
	ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
	const measured = ctx.measureText(text).width;
	if (measured > maxTextWidth && measured > 0) {
		fontSize = Math.floor((fontSize * maxTextWidth) / measured);
		ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
	}
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = '#fff';
	// Place at 38% from top — leaves room for nav overlay below
	ctx.fillText(text, canvasWidth / 2, canvasHeight * 0.38);

	const { data } = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
	const pixels: Point[] = [];

	for (let y = 0; y < canvasHeight; y++) {
		for (let x = 0; x < canvasWidth; x++) {
			if (data[(y * canvasWidth + x) * 4] > 128) {
				pixels.push({ x, y });
			}
		}
	}

	if (pixels.length <= maxSamples) return pixels;

	// Subsample evenly to stay within maxSamples
	const step = pixels.length / maxSamples;
	return Array.from({ length: maxSamples }, (_, i) => pixels[Math.floor(i * step)]);
}
