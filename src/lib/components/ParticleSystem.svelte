<script lang="ts">
	import { useTask, useThrelte } from '@threlte/core';
	import { T } from '@threlte/core';
	import { Points } from 'three';
	import { rasterizeText, type TextRasterOptions } from '$lib/utils/textMask';
	import type { Point, Particle } from '$lib/particle/types';
	import { makeParticle, triggerNearMouse, retargetGroup } from '$lib/particle/physics';
	import { createHeroMaterial } from '$lib/particle/shaders';
	import { createParticleBuffers } from '$lib/particle/buffers';
	import { getParticleContext } from '$lib/particle/context.svelte';

	const ctx = getParticleContext();

	// ── Constants ──
	const HERO_N = 80_000;
	const BIO_N = 75_000;
	const HAND_N = 10_000;
	const TOTAL_N = HERO_N + BIO_N + HAND_N;
	const MOUSE_RADIUS = 130;
	const PULSE_RADIUS = MOUSE_RADIUS * 1.2;
	const PULSE_WAVE_SPEED = 0.004;
	const MAX_TRIGGERS_PER_FRAME = 5_000;
	const INTRO_FLY = 1_250;
	const SIZE_PULSE_SPEED = 0.0012;
	const HERO_POINT_MIN = 5.0;
	const HERO_POINT_MAX = 16.0;
	const RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;

	const HERO_TEXT: Omit<TextRasterOptions, 'canvasWidth' | 'canvasHeight' | 'centerX' | 'centerY'> =
		{
			text: "Hey I'm Casey Haber",
			widthFrac: 0.85,
			fontWeight: 900,
			maxSamples: HERO_N * 2
		};

	const BIO_BLURB =
		"I'm a platform engineer with a decade of leading data visualization experiences — from research tools, to enterprise BI, to maintaining libraries that serve millions. Part product lead, part systems architect, mostly chart enthusiast.";

	// ── Threlte context ──
	const { size } = useThrelte();

	// ── GPU buffers & material ──
	const buffers = createParticleBuffers(TOTAL_N);
	const material = createHeroMaterial(PULSE_RADIUS);
	material.uniforms.uPointSizeMin.value = HERO_POINT_MIN;
	material.uniforms.uPointSizeMax.value = HERO_POINT_MAX;
	const pointsMesh = new Points(buffers.geometry, material);
	// Disable frustum culling: the geometry's bounding sphere is computed once
	// from initial positions, but particles fly freely and the mesh is shifted
	// by `-scrollY` each frame. Without this the entire system gets culled
	// once you've scrolled far enough that the stale sphere leaves the frustum.
	pointsMesh.frustumCulled = false;

	// ── Particle state (rebuilt on resize) ──
	let heroParticles: Particle[] = [];
	let bioParticles: Particle[] = [];
	let handParticles: Particle[] = [];
	let allParticles: Particle[] = [];

	interface HandOffset {
		x: number;
		y: number;
		z: number;
	}
	let handOffsets3D: HandOffset[] = [];

	let handCenterX = 0;
	let handCenterY = 0;
	let currentAngle = 0; // 2D screen-plane angle toward mouse
	const PERSP_DIST = 180;
	const DOME_DEPTH = 0.55;
	const TURN_SPEED = 0.08;
	const FORWARD_TILT = 0.35; // constant forward lean into the screen (radians)

	let mouseX = -MOUSE_RADIUS * 2;
	let mouseY = -MOUSE_RADIUS * 2;
	let mouseEverSet = false;

	// ── Scroll-based header tracking ──
	let currentPhase: 'hero' | 'underline' = 'hero';
	let activeHeaderKey: string | null = null;
	let savedHeroTargets: Point[] = [];
	let savedBioTargets: Point[] = [];
	let savedHandTargets: Point[] = [];


	const BIO_FONT = "'Space Grotesk', system-ui, -apple-system, sans-serif";

	/** Rasterize left-aligned, word-wrapped text and return pixel positions. */
	function rasterizeBio(
		text: string,
		canvasW: number,
		canvasH: number,
		x0: number,
		y0: number,
		maxWidth: number,
		fontSize: number,
		maxSamples: number
	): Point[] {
		const canvas = document.createElement('canvas');
		canvas.width = canvasW;
		canvas.height = canvasH;
		const ctx = canvas.getContext('2d')!;
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, canvasW, canvasH);

		ctx.font = `500 ${fontSize}px ${BIO_FONT}`;
		// Slight negative tracking — keeps the eye moving across the line and
		// reads better at the size pixels resolve to. Set BEFORE measureText so
		// word-wrap accounts for the tighter glyphs.
		ctx.letterSpacing = '-0.4px';
		ctx.fillStyle = '#fff';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'top';

		// Word-wrap
		const words = text.split(' ');
		const lineHeight = Math.round(fontSize * 1.6);
		const lines: string[] = [];
		let cur = '';
		for (const word of words) {
			const test = cur ? cur + ' ' + word : word;
			if (ctx.measureText(test).width > maxWidth && cur) {
				lines.push(cur);
				cur = word;
			} else {
				cur = test;
			}
		}
		if (cur) lines.push(cur);

		for (let i = 0; i < lines.length; i++) {
			ctx.fillText(lines[i], x0, y0 + i * lineHeight);
		}

		const { data } = ctx.getImageData(0, 0, canvasW, canvasH);
		const pixels: Point[] = [];
		for (let y = 0; y < canvasH; y++) {
			for (let x = 0; x < canvasW; x++) {
				if (data[(y * canvasW + x) * 4] > 128) {
					pixels.push({ x, y });
				}
			}
		}

		if (pixels.length <= maxSamples) return pixels;
		const step = pixels.length / maxSamples;
		return Array.from({ length: maxSamples }, (_, i) => pixels[Math.floor(i * step)]);
	}

	/** Rasterize the 👋 emoji and map onto a dome for 3D depth. */
	function rasterizeHand(handSize: number): HandOffset[] {
		const canvas = document.createElement('canvas');
		canvas.width = handSize;
		canvas.height = handSize;
		const ctx = canvas.getContext('2d')!;
		ctx.clearRect(0, 0, handSize, handSize);
		ctx.font = `${Math.floor(handSize * 0.7)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('👋', handSize / 2, handSize / 2);

		const { data } = ctx.getImageData(0, 0, handSize, handSize);
		const pixels: HandOffset[] = [];
		const cx = handSize / 2;
		const cy = handSize / 2;
		const R = handSize / 2;
		for (let y = 0; y < handSize; y++) {
			for (let x = 0; x < handSize; x++) {
				const idx = (y * handSize + x) * 4;
				if (data[idx + 3] > 50) {
					const ox = x - cx;
					const oy = y - cy;
					// Map onto a dome: z = sqrt(R² - x² - y²) * depth factor
					const d2 = (ox * ox + oy * oy) / (R * R);
					const z = d2 < 1 ? Math.sqrt(1 - d2) * R * DOME_DEPTH : 0;
					pixels.push({ x: ox, y: oy, z });
				}
			}
		}
		return pixels;
	}

	/**
	 * Find the most-recently-crossed portfolio header — i.e. the last one whose
	 * top has scrolled above the line 1/3 up from the viewport bottom.
	 */
	function findActiveHeader(viewH: number): HTMLElement | null {
		const headers = document.querySelectorAll<HTMLElement>('[data-particle-header]');
		const threshold = viewH * (2 / 3);
		let active: HTMLElement | null = null;
		for (const h of headers) {
			if (h.getBoundingClientRect().top < threshold) {
				active = h;
			}
		}
		return active;
	}

	/**
	 * Soft puff cloud around a target rect (in document coords). Triangular
	 * distribution along each axis → particles peak near the header center and
	 * thin out toward the edges, giving an organic dispersed look.
	 */
	function generatePuffCloud(rect: DOMRect, count: number, scrollY: number): Point[] {
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2 + scrollY;
		const spreadX = rect.width / 2 + 90;
		const spreadY = rect.height / 2 + 70;
		const points: Point[] = [];
		for (let i = 0; i < count; i++) {
			// Sum of two uniforms − 1 → triangular dist on [-1, 1] peaking at 0.
			const u1 = Math.random() + Math.random() - 1;
			const u2 = Math.random() + Math.random() - 1;
			points.push({ x: cx + u1 * spreadX, y: cy + u2 * spreadY });
		}
		return points;
	}

	// ── Initialize on resize ──
	$effect(() => {
		const W = $size.width;
		const H = $size.height;
		if (W <= 0 || H <= 0) return;

		const heroY = H * 0.38;

		// Hero text
		const heroPixels = rasterizeText({
			...HERO_TEXT,
			canvasWidth: W,
			canvasHeight: H,
			centerX: W / 2,
			centerY: heroY
		});

		// Find hero text bounding box
		let heroMinX = W;
		let heroMaxY = 0;
		for (const p of heroPixels) {
			if (p.x < heroMinX) heroMinX = p.x;
			if (p.y > heroMaxY) heroMaxY = p.y;
		}

		// Bio text — left-aligned below hero, word-wrapped. Slightly larger
		// font + medium weight so glyph strokes survive the size-pulse trough.
		const bioFontSize = Math.round(Math.min(W, H) * 0.028);
		const bioMaxW = Math.min(540, Math.round(W * 0.5));
		const bioY = heroMaxY + Math.round(H * 0.06);
		const bioPixels = rasterizeBio(
			BIO_BLURB,
			W,
			H,
			heroMinX,
			bioY,
			bioMaxW,
			bioFontSize,
			BIO_N * 2
		);

		// Hand emoji
		const handSize = Math.round(Math.min(W, H) * 0.1);
		handOffsets3D = rasterizeHand(handSize);

		// Position hand just to the right of the hero text
		let heroMaxX = 0;
		for (const p of heroPixels) {
			if (p.x > heroMaxX) heroMaxX = p.x;
		}
		handCenterX = heroMaxX + handSize * 0.65;
		handCenterY = heroY - handSize * 0.15;

		// Save targets for scroll transitions
		savedHeroTargets = heroPixels;
		savedBioTargets = bioPixels;
		currentPhase = 'hero';
		activeHeaderKey = null;

		// Create hero particles — zero noise for readability
		heroParticles = Array.from({ length: HERO_N }, (_, i) => {
			const target = heroPixels[i % heroPixels.length];
			const p = makeParticle(Math.random() * W, Math.random() * H, target, target.x / W, INTRO_FLY);
			p.offsetX = 0;
			p.offsetY = 0;
			return p;
		});

		// Create bio particles — clean like the hand, slightly larger
		bioParticles = Array.from({ length: BIO_N }, (_, i) => {
			const target = bioPixels[i % bioPixels.length];
			const p = makeParticle(Math.random() * W, Math.random() * H, target, target.x / W, INTRO_FLY);
			p.offsetX = 0;
			p.offsetY = 0;
			return p;
		});

		// Create hand particles — fly in to initial position (unrotated)
		handParticles = Array.from({ length: HAND_N }, (_, i) => {
			const offset =
				handOffsets3D.length > 0 ? handOffsets3D[i % handOffsets3D.length] : { x: 0, y: 0, z: 0 };
			const target = { x: handCenterX + offset.x, y: handCenterY + offset.y };
			const p = makeParticle(
				Math.random() * W,
				Math.random() * H,
				target,
				0.7 + Math.random() * 0.3,
				INTRO_FLY
			);
			// Vivid golden color for the hand
			p.cr = 0.95;
			p.cg = 0.7;
			p.cb = 0.15;
			// Zero position noise so the hand reads cleanly
			p.offsetX = 0;
			p.offsetY = 0;
			return p;
		});

		// Save hand targets for returning from underline
		savedHandTargets = handParticles.map((p) => ({ x: p.targetX, y: p.targetY }));

		allParticles = [...heroParticles, ...bioParticles, ...handParticles];
		buffers.uploadInitial(allParticles);

		// Make all text particles uniformly small for crisp readability
		const sizeAttr = buffers.geometry.getAttribute('pointSizeScale');
		// Hero: tight and uniform
		for (let i = 0; i < HERO_N; i++) {
			(sizeAttr as any).setX(i, 0.08);
		}
		// Bio: small dots + high density read as crisp letterforms. Bigger points
		// blob neighbors together and smear the glyph shapes.
		for (let i = 0; i < BIO_N; i++) {
			(sizeAttr as any).setX(HERO_N + i, 0.0);
		}
		// Hand: smallest, tightest
		const handStart = HERO_N + BIO_N;
		for (let i = 0; i < HAND_N; i++) {
			(sizeAttr as any).setX(handStart + i, 0.05);
		}
		sizeAttr.needsUpdate = true;

		buffers.activate(TOTAL_N);
	});

	// ── Animation loop ──
	useTask(() => {
		if (heroParticles.length === 0) return;
		const now = performance.now();

		material.uniforms.uSizeTime.value = now * SIZE_PULSE_SPEED;
		material.uniforms.uMouse.value.set(mouseX, mouseY);
		material.uniforms.uPulseTime.value = now * PULSE_WAVE_SPEED;

		// ── Scroll the scene: offset mesh so camera views the current document slice ──
		// The canvas itself rides the document via the layout's per-rAF translateY,
		// so this just renders the slice that lines up with the current viewport.
		const scrollY = window.scrollY;
		pointsMesh.position.y = -scrollY;

		// ── Header tracking: hover takes priority over scroll position ──
		const viewH = $size.height;
		const scrollHeader = findActiveHeader(viewH);
		const hoveredHeader = ctx.hoveredHeader;
		const effectiveHeader = hoveredHeader ?? scrollHeader;
		const effectiveKey = effectiveHeader?.getAttribute('data-particle-header') ?? null;
		const isHover = hoveredHeader !== null;

		if (effectiveKey !== activeHeaderKey) {
			const wasHero = currentPhase === 'hero';
			activeHeaderKey = effectiveKey;

			if (effectiveHeader) {
				// Section active → settle into a puff cloud around the header.
				// One-shot, no reform. Each new active section just retargets to
				// a fresh cloud at that section's position.
				currentPhase = 'underline';
				const rect = effectiveHeader.getBoundingClientRect();
				const targets = generatePuffCloud(rect, TOTAL_N, scrollY);
				retargetGroup(allParticles, targets, now, wasHero ? 1500 : 900, isHover ? 200 : 250);
			} else {
				// No active section — return to hero.
				currentPhase = 'hero';
				retargetGroup(heroParticles, savedHeroTargets, now, 1500, 300);
				retargetGroup(bioParticles, savedBioTargets, now, 1500, 300);
				retargetGroup(handParticles, savedHandTargets, now, 1500, 300);
				for (const p of handParticles) {
					p.cr = 0.95;
					p.cg = 0.7;
					p.cb = 0.15;
				}
			}
		}

		// Mouse ripple on hero + bio (only in hero phase)
		if (currentPhase === 'hero' && mouseEverSet) {
			let remaining = MAX_TRIGGERS_PER_FRAME;
			remaining -= triggerNearMouse(heroParticles, mouseX, mouseY, RADIUS_SQ, now, remaining);
			if (remaining > 0) {
				triggerNearMouse(bioParticles, mouseX, mouseY, RADIUS_SQ, now, remaining);
			}
		}

		// Hand: 2D rotate to point at mouse + 3D dome tilt for depth (hero phase only)
		if (currentPhase === 'hero' && handOffsets3D.length > 0) {
			if (mouseEverSet) {
				const targetAngle = Math.atan2(mouseY - handCenterY, mouseX - handCenterX);
				let diff = targetAngle - currentAngle;
				if (diff > Math.PI) diff -= 2 * Math.PI;
				if (diff < -Math.PI) diff += 2 * Math.PI;
				currentAngle += diff * TURN_SPEED;
			}

			// 2D rotation (screen-plane pointing)
			const cosA = Math.cos(currentAngle);
			const sinA = Math.sin(currentAngle);
			// Forward tilt (lean the dome toward the viewer)
			const cosT = Math.cos(FORWARD_TILT);
			const sinT = Math.sin(FORWARD_TILT);

			for (let i = 0; i < handParticles.length; i++) {
				const p = handParticles[i];
				const o = handOffsets3D[i % handOffsets3D.length];

				// Step 1: rotate in screen plane to face mouse
				const x1 = o.x * cosA - o.y * sinA;
				const y1 = o.x * sinA + o.y * cosA;
				const z1 = o.z;

				// Step 2: tilt forward (rotate around local X-axis)
				const y2 = y1 * cosT - z1 * sinT;
				const z2 = y1 * sinT + z1 * cosT;

				// Step 3: perspective projection
				const scale = PERSP_DIST / (PERSP_DIST + z2);
				const rx = x1 * scale;
				const ry = y2 * scale;

				p.targetX = handCenterX + rx;
				p.targetY = handCenterY + ry;
				p.homeX = p.targetX;
				p.homeY = p.targetY;
				p.x = p.targetX;
				p.y = p.targetY;
				p.triggered = true;
				p.flyStart = now - p.flyDuration;

				// Depth shading — high floor so gold stays vivid
				const shade = 0.88 + 0.12 * Math.max(0, Math.min(1, (PERSP_DIST - z2) / (PERSP_DIST * 2)));
				p.cr = 0.95 * shade;
				p.cg = 0.7 * shade;
				p.cb = 0.15 * shade;
			}
		}

		buffers.uploadFrame(allParticles, now, 1);
	});

	// ── Event handlers ──
	// Listen on window so the canvas-root's `pointer-events: none` doesn't block us.
	// The canvas is full-viewport and starts at the top, so client coords are also
	// canvas-local coords — no rect math needed.
	function handleMouseMove(e: MouseEvent) {
		mouseX = e.clientX;
		mouseY = e.clientY;
		mouseEverSet = true;
	}

	$effect(() => {
		window.addEventListener('mousemove', handleMouseMove);
		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
		};
	});

	$effect(() => {
		return () => {
			buffers.dispose();
			material.dispose();
		};
	});
</script>

<T is={pointsMesh} />
