import type { Point } from './textMask';

type SpanKind = 'normal' | 'bold' | 'link';
interface Span { text: string; kind: SpanKind; href?: string }
type BlockKind = 'h1' | 'h2' | 'h3' | 'h4' | 'paragraph' | 'listitem' | 'spacer';
interface Block { kind: BlockKind; spans: Span[] }

const FONT_FAMILY = "'Silkscreen', monospace";

function parseInline(raw: string): Span[] {
	const spans: Span[] = [];
	let s = raw;
	while (s.length) {
		const boldIdx = s.indexOf('**');
		const linkIdx = s.indexOf('[');
		const next = Math.min(boldIdx < 0 ? Infinity : boldIdx, linkIdx < 0 ? Infinity : linkIdx);
		if (!isFinite(next)) {
			if (s) spans.push({ text: s, kind: 'normal' });
			break;
		}
		if (next > 0) {
			spans.push({ text: s.slice(0, next), kind: 'normal' });
			s = s.slice(next);
		}
		if (s.startsWith('**')) {
			const end = s.indexOf('**', 2);
			if (end < 0) { spans.push({ text: s, kind: 'normal' }); break; }
			spans.push({ text: s.slice(2, end), kind: 'bold' });
			s = s.slice(end + 2);
		} else {
			const te = s.indexOf(']');
			if (te < 0 || s[te + 1] !== '(') { spans.push({ text: s[0], kind: 'normal' }); s = s.slice(1); continue; }
			const ue = s.indexOf(')', te + 1);
			if (ue < 0) { spans.push({ text: s, kind: 'normal' }); break; }
			spans.push({ text: s.slice(1, te), kind: 'link', href: s.slice(te + 2, ue) });
			s = s.slice(ue + 1);
		}
	}
	return spans.filter((sp) => sp.text.length > 0);
}

function parseMarkdown(md: string): Block[] {
	return md.split('\n').map((raw): Block => {
		const line = raw.trimEnd();
		if (!line.trim()) return { kind: 'spacer', spans: [] };
		if (line.startsWith('#### ')) return { kind: 'h4', spans: parseInline(line.slice(5)) };
		if (line.startsWith('### ')) return { kind: 'h3', spans: parseInline(line.slice(4)) };
		if (line.startsWith('## ')) return { kind: 'h2', spans: parseInline(line.slice(3)) };
		if (line.startsWith('# ')) return { kind: 'h1', spans: parseInline(line.slice(2)) };
		if (line.startsWith('- ') || line.startsWith('* '))
			return { kind: 'listitem', spans: parseInline(line.slice(2)) };
		return { kind: 'paragraph', spans: parseInline(line) };
	});
}

function blockFontSize(kind: BlockKind, base: number): number {
	if (kind === 'h1' || kind === 'h2') return Math.round(base * 1.4);
	if (kind === 'h3') return Math.round(base * 1.2);
	return base;
}

function blockFontWeight(kind: BlockKind): string {
	return kind === 'h1' || kind === 'h2' || kind === 'h3' || kind === 'h4' ? '700' : '400';
}

function makeFont(size: number, weight: string): string {
	return `${weight} ${size}px ${FONT_FAMILY}`;
}

type Token = { text: string; bold: boolean; href?: string };

function wrapToLines(
	ctx: CanvasRenderingContext2D,
	spans: Span[],
	prefix: string,
	size: number,
	weight: string,
	maxW: number
): Token[][] {
	const lines: Token[][] = [];
	let cur: Token[] = [];
	let curX = 0;

	function flush() {
		if (cur.length) { lines.push(cur); cur = []; curX = 0; }
	}

	function append(text: string, bold: boolean, href?: string) {
		ctx.font = makeFont(size, bold ? '700' : weight);
		const w = ctx.measureText(text).width;
		if (curX + w > maxW && cur.length > 0) flush();
		const last = cur[cur.length - 1];
		if (last && last.bold === bold && last.href === href) {
			last.text += text;
		} else {
			cur.push({ text, bold, href });
		}
		curX += w;
	}

	if (prefix) append(prefix, false);

	for (const span of spans) {
		const bold = span.kind === 'bold';
		const href = span.href;
		const words = span.text.split(' ');
		for (let i = 0; i < words.length; i++) {
			const w = i < words.length - 1 ? words[i] + ' ' : words[i];
			if (w) append(w, bold, href);
		}
	}

	flush();
	return lines;
}

export interface HitRegion {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface LinkRegion extends HitRegion {
	href: string;
}

export interface ContentLayout {
	pixels: Point[];
	backArrowBounds: HitRegion;
	links: LinkRegion[];
}

export async function renderContentWithTitle(
	title: string,
	markdown: string,
	canvasW: number,
	canvasH: number,
	x0: number,
	maxWidth: number,
	baseFontSize = 12
): Promise<ContentLayout> {
	const titleSize = Math.round(baseFontSize * 2.8);
	await document.fonts.load(`400 ${baseFontSize}px 'Silkscreen'`);
	await document.fonts.load(`700 ${baseFontSize}px 'Silkscreen'`);
	await document.fonts.load(`700 ${titleSize}px 'Silkscreen'`);

	const canvas = document.createElement('canvas');
	canvas.width = canvasW;
	canvas.height = canvasH;
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, canvasW, canvasH);
	ctx.fillStyle = '#fff';
	ctx.textBaseline = 'top';

	// Draw title header "← {title}" — arrow and title are both large
	const titleY = Math.round(canvasH * 0.06);
	const titleFont = makeFont(titleSize, '700');
	ctx.font = titleFont;
	const arrowText = '← ';
	const arrowW = ctx.measureText(arrowText).width;
	ctx.fillText(arrowText + title, x0, titleY);

	const backArrowBounds = {
		x: x0,
		y: titleY,
		w: arrowW + ctx.measureText(title).width,
		h: Math.round(titleSize * 2.2)
	};

	// Draw markdown body below title
	const bodyY = Math.round(titleY + titleSize * 2.8);
	const links: LinkRegion[] = [];
	let cy = bodyY;
	for (const block of parseMarkdown(markdown)) {
		if (block.kind === 'spacer') { cy += Math.round(baseFontSize * 0.6); continue; }

		const size = blockFontSize(block.kind, baseFontSize);
		const weight = blockFontWeight(block.kind);
		const lineH = Math.round(size * 2.2);
		const prefix = block.kind === 'listitem' ? '- ' : '';
		const wrapped = wrapToLines(ctx, block.spans, prefix, size, weight, maxWidth);

		for (const line of wrapped) {
			let cx = x0;
			for (const token of line) {
				ctx.font = makeFont(size, token.bold ? '700' : weight);
				const tokenW = ctx.measureText(token.text).width;
				ctx.fillText(token.text, cx, cy);

				if (token.href) {
					// Draw underline and record hit region
					const underlineY = cy + size + 2;
					ctx.fillRect(cx, underlineY, tokenW, Math.max(1, Math.round(size * 0.1)));
					links.push({ x: cx, y: cy, w: tokenW, h: lineH, href: token.href });
				}

				cx += tokenW;
			}
			cy += lineH;
		}
		if (block.kind !== 'listitem' && block.kind !== 'paragraph') {
			cy += Math.round(baseFontSize * 0.2);
		}
	}

	const { data } = ctx.getImageData(0, 0, canvasW, canvasH);
	const points: Point[] = [];
	for (let y = 0; y < canvasH; y++) {
		for (let x = 0; x < canvasW; x++) {
			if (data[(y * canvasW + x) * 4] > 128) {
				points.push({ x, y });
			}
		}
	}
	return { pixels: points, backArrowBounds, links };
}

export async function renderMarkdownToPixels(
	markdown: string,
	canvasW: number,
	canvasH: number,
	x0: number,
	y0: number,
	maxWidth: number,
	baseFontSize = 12
): Promise<Point[]> {
	await document.fonts.load(`400 ${baseFontSize}px 'Silkscreen'`);
	await document.fonts.load(`700 ${baseFontSize}px 'Silkscreen'`);

	const canvas = document.createElement('canvas');
	canvas.width = canvasW;
	canvas.height = canvasH;
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, canvasW, canvasH);
	ctx.fillStyle = '#fff';
	ctx.textBaseline = 'top';

	let cy = y0;
	for (const block of parseMarkdown(markdown)) {
		if (block.kind === 'spacer') { cy += Math.round(baseFontSize * 0.6); continue; }

		const size = blockFontSize(block.kind, baseFontSize);
		const weight = blockFontWeight(block.kind);
		const lineH = Math.round(size * 2.2);
		const prefix = block.kind === 'listitem' ? '- ' : '';
		const wrapped = wrapToLines(ctx, block.spans, prefix, size, weight, maxWidth);

		for (const line of wrapped) {
			let cx = x0;
			for (const token of line) {
				ctx.font = makeFont(size, token.bold ? '700' : weight);
				ctx.fillText(token.text, cx, cy);
				cx += ctx.measureText(token.text).width;
			}
			cy += lineH;
		}
		// Extra breathing room after headings
		if (block.kind !== 'listitem' && block.kind !== 'paragraph') {
			cy += Math.round(baseFontSize * 0.2);
		}
	}

	const { data } = ctx.getImageData(0, 0, canvasW, canvasH);
	const points: Point[] = [];
	for (let y = 0; y < canvasH; y++) {
		for (let x = 0; x < canvasW; x++) {
			if (data[(y * canvasW + x) * 4] > 128) {
				points.push({ x, y });
			}
		}
	}
	return points;
}
