export interface Point {
	x: number;
	y: number;
}

export interface TextRasterOptions {
	/** Text to draw */
	text: string;
	canvasWidth: number;
	canvasHeight: number;
	/** Center X in pixels */
	centerX: number;
	/** Center Y in pixels */
	centerY: number;
	/** Font size; if omitted, auto-sized to fit widthFrac of canvas width */
	fontSize?: number;
	/** When fontSize is omitted, text width target as fraction of canvas (default 0.65) */
	widthFrac?: number;
	/** Font weight: CSS value or number (default 100) */
	fontWeight?: string | number;
	/** Max pixel samples to return (default 30000) */
	maxSamples?: number;
}

const DEFAULT_FONT = "'Space Grotesk', system-ui, -apple-system, sans-serif";

/**
 * Rasterizes text at the given position and returns pixel coordinates inside the glyphs.
 * Single entry point for "draw this text here".
 */
export function rasterizeText(options: TextRasterOptions): Point[] {
	const {
		text,
		canvasWidth,
		canvasHeight,
		centerX,
		centerY,
		widthFrac = 0.65,
		fontWeight = 100,
		maxSamples = 3000000
	} = options;

	const canvas = document.createElement('canvas');
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;
	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, canvasWidth, canvasHeight);

	let fontSize = options.fontSize;
	if (fontSize == null) {
		fontSize = Math.floor((canvasWidth * widthFrac) / (text.length * 0.55));
		ctx.font = `${fontWeight} ${fontSize}px ${DEFAULT_FONT}`;
		const measured = ctx.measureText(text).width;
		const maxTextWidth = canvasWidth * widthFrac;
		if (measured > maxTextWidth && measured > 0) {
			fontSize = Math.floor((fontSize * maxTextWidth) / measured);
		}
	}
	ctx.font = `${fontWeight} ${fontSize}px ${DEFAULT_FONT}`;
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

