<script lang="ts">
	import { useTask, useThrelte } from '@threlte/core';
	import { T } from '@threlte/core';
	import { BufferGeometry, BufferAttribute, Points } from 'three';
	import { rasterizeText, type TextRasterOptions } from '$lib/utils/textMask';
	import type { Point, Particle } from '$lib/particle/types';
	import {
		easeOutCubic,
		makeParticle,
		retargetGroup,
		retargetGroupStaggered,
		resetGroupToInitial,
		writeParticleToBuffers
	} from '$lib/particle/physics';
	import { createHeroMaterial } from '$lib/particle/shaders';
	import { getParticleContext } from '$lib/particle/context.svelte';
	import { renderContentWithTitle, type ContentLayout } from '$lib/utils/markdownPixels';

	import aboutRaw from '$lib/docs/about.svx?raw';
	import projectsRaw from '$lib/docs/projects.svx?raw';
	import writingRaw from '$lib/docs/writing.svx?raw';

	// Matches nav order: Projects (0), Writing (1), About (2)
	const DOCS = [projectsRaw, writingRaw, aboutRaw];
	const NAV_TITLES = ['Projects', 'Writing', 'About'];

	// ── Constants ──
	const CASEY_N = 300_000;
	const NAV_N = 60_000;
	const MOUSE_RADIUS = 130;
	const PULSE_RADIUS = MOUSE_RADIUS * 1.2;
	const PULSE_WAVE_SPEED = 0.004;
	const MAX_TRIGGERS_PER_FRAME = 5_000;
	const INTRO_FLY = 1_250;
	const SWAP_DURATION = 1_000;
	const CONTENT_FLY_DURATION = 1_200;
	const CONTENT_STAGGER_MS = 400;
	const RESET_DURATION = 2_600;
	const RESET_STAGGER_MS = 900;
	const TOTAL_N = CASEY_N + NAV_N * 3;
	const NAV_HIT_W = 240;
	const NAV_HIT_H = 80;
	const SIZE_PULSE_SPEED = 0.0012;
	const BASE_FONT = 16;
	const CONTENT_POINT_MIN = 1.5;
	const CONTENT_POINT_MAX = 3.5;
	const HERO_POINT_MIN = 2.0;
	const HERO_POINT_MAX = 10.0;

	const HERO_TEXT: Omit<TextRasterOptions, 'canvasWidth' | 'canvasHeight' | 'centerX' | 'centerY'> =
		{
			text: 'Casey',
			widthFrac: 0.65,
			fontWeight: 900,
			maxSamples: CASEY_N * 2
		};

	const NAV_TEXTS = [
		{ text: 'projects', xFrac: 0.2, yFrac: 0.8, fontSize: 56, maxParticles: NAV_N },
		{ text: 'writing', xFrac: 0.5, yFrac: 0.8, fontSize: 56, maxParticles: NAV_N },
		{ text: 'about', xFrac: 0.8, yFrac: 0.8, fontSize: 56, maxParticles: NAV_N }
	] as const;

	const RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;

	// ── Threlte context ──
	const { size, renderer } = useThrelte();
	const ctx = getParticleContext();

	// ── GPU buffers (pre-allocated, fixed size) ──
	const positions = new Float32Array(TOTAL_N * 3);
	const particleColors = new Float32Array(TOTAL_N * 3);
	const alphas = new Float32Array(TOTAL_N);
	const pointSizeScales = new Float32Array(TOTAL_N);
	const sizePhases = new Float32Array(TOTAL_N);

	const geometry = new BufferGeometry();
	const posAttr = new BufferAttribute(positions, 3);
	const colorAttr = new BufferAttribute(particleColors, 3);
	const alphaAttr = new BufferAttribute(alphas, 1);
	const pointSizeAttr = new BufferAttribute(pointSizeScales, 1);
	const sizePhaseAttr = new BufferAttribute(sizePhases, 1);
	geometry.setAttribute('position', posAttr);
	geometry.setAttribute('particleColor', colorAttr);
	geometry.setAttribute('alpha', alphaAttr);
	geometry.setAttribute('pointSizeScale', pointSizeAttr);
	geometry.setAttribute('sizePhase', sizePhaseAttr);
	geometry.setDrawRange(0, 0);

	const material = createHeroMaterial(PULSE_RADIUS);
	const pointsMesh = new Points(geometry, material);

	// ── Particle state (rebuilt on resize) ──
	let caseyParticles: Particle[] = [];
	let navParticles: Particle[][] = [[], [], []];
	let allParticles: Particle[] = [];
	let navCx: number[] = [0, 0, 0];
	let navCy = 0;

	let caseyHeroPixels: Point[] = [];
	let navScalePixels: Point[][] = [[], [], []];

	type Phase = 'idle' | 'swapping' | 'content';
	let phase: Phase = 'idle';
	let selectedNavIndex: number | null = null;
	let pendingSwap: number | null = null;
	let swapStart = 0;
	let generation = 0;
	let backArrowBounds: ContentLayout['backArrowBounds'] | null = null;
	let settleProgress = 0; // 0 = full noise (hero), 1 = settled (content crisp)
	let settleStart = 0;
	const SETTLE_DURATION = 800;
	const SETTLE_DELAY = 600; // wait for most particles to arrive before settling

	let mouseX = -MOUSE_RADIUS * 2;
	let mouseY = -MOUSE_RADIUS * 2;
	let mouseEverSet = false;

	// ── Reset effect ──
	$effect(() => {
		const trigger = ctx.resetCount;
		if (trigger === 0 || caseyParticles.length === 0) return;
		phase = 'idle';
		selectedNavIndex = null;
		pendingSwap = null;
		backArrowBounds = null;
		settleProgress = 0;
		material.uniforms.uPointSizeMin.value = HERO_POINT_MIN;
		material.uniforms.uPointSizeMax.value = HERO_POINT_MAX;
		ctx.selectNav(null);
		const now = performance.now();
		resetGroupToInitial(caseyParticles, now, RESET_DURATION, RESET_STAGGER_MS);
		for (const group of navParticles) {
			resetGroupToInitial(group, now, RESET_DURATION, RESET_STAGGER_MS);
		}
	});

	// ── Initialize on resize ──
	$effect(() => {
		const W = $size.width;
		const H = $size.height;
		if (W <= 0 || H <= 0) return;

		phase = 'idle';
		selectedNavIndex = null;
		pendingSwap = null;
		backArrowBounds = null;
		ctx.selectNav(null);

		const measureCtx = document.createElement('canvas').getContext('2d')!;
		navCy = H * NAV_TEXTS[0].yFrac;
		navCx = NAV_TEXTS.map((item) => {
			measureCtx.font = `100 ${item.fontSize}px system-ui, -apple-system, sans-serif`;
			const textW = measureCtx.measureText(item.text).width;
			const rawX = W * item.xFrac;
			return Math.max(textW / 2 + 10, Math.min(W - textW / 2 - 10, rawX));
		});

		caseyHeroPixels = rasterizeText({
			...HERO_TEXT,
			canvasWidth: W,
			canvasHeight: H,
			centerX: W / 2,
			centerY: H * 0.38
		});

		navScalePixels = NAV_TEXTS.map((item, i) =>
			rasterizeText({
				text: item.text,
				canvasWidth: W,
				canvasHeight: H,
				centerX: navCx[i],
				centerY: navCy,
				fontSize: item.fontSize,
				maxSamples: item.maxParticles * 2
			})
		);

		caseyParticles = Array.from({ length: CASEY_N }, (_, i) => {
			const target = caseyHeroPixels[i % caseyHeroPixels.length];
			return makeParticle(Math.random() * W, Math.random() * H, target, target.x / W, INTRO_FLY);
		});

		navParticles = NAV_TEXTS.map((_, ni) => {
			const pixels = navScalePixels[ni];
			return Array.from({ length: NAV_N }, (_, i) => {
				const target = pixels[i % pixels.length];
				return makeParticle(
					Math.random() * W,
					Math.random() * H,
					target,
					ni / (NAV_TEXTS.length - 1),
					INTRO_FLY
				);
			});
		});

		// Build flat reference array for content retargeting
		allParticles = [...caseyParticles, ...navParticles.flat()];

		// Upload initial buffer state
		let idx = 0;
		for (const p of allParticles) {
			positions[idx * 3] = p.homeX + p.offsetX;
			positions[idx * 3 + 1] = p.homeY + p.offsetY;
			positions[idx * 3 + 2] = 0;
			particleColors[idx * 3] = 96 / 255;
			particleColors[idx * 3 + 1] = 128 / 255;
			particleColors[idx * 3 + 2] = 192 / 255;
			alphas[idx] = 20 / 255;
			pointSizeScales[idx] = Math.random();
			sizePhases[idx] = Math.random() * 6.28318530718;
			idx++;
		}

		posAttr.needsUpdate = true;
		colorAttr.needsUpdate = true;
		alphaAttr.needsUpdate = true;
		pointSizeAttr.needsUpdate = true;
		sizePhaseAttr.needsUpdate = true;
		geometry.setDrawRange(0, TOTAL_N);
	});

	// ── Nav selection: render content and retarget all particles ──
	function selectContent(navIdx: number) {
		const W = $size.width;
		const H = $size.height;
		generation++;
		const gen = generation;
		selectedNavIndex = navIdx;
		ctx.selectNav(navIdx);
		phase = 'swapping';
		swapStart = performance.now();

		const displayW = Math.min(520, Math.round(W * 0.8));
		const x0 = Math.round((W - displayW) / 2);

		renderContentWithTitle(NAV_TITLES[navIdx], DOCS[navIdx], W, H, x0, displayW, BASE_FONT).then(
			(layout) => {
				if (gen !== generation) return; // stale
				backArrowBounds = layout.backArrowBounds;
				const now = performance.now();
				retargetGroupStaggered(
					allParticles,
					layout.pixels,
					now,
					CONTENT_FLY_DURATION,
					CONTENT_STAGGER_MS
				);
				// Start settle animation after particles begin arriving
				settleProgress = 0;
				settleStart = now + SETTLE_DELAY;
				phase = 'content';
			}
		);
	}

	function deselectContent() {
		generation++;
		backArrowBounds = null;
		selectedNavIndex = null;
		ctx.selectNav(null);
		phase = 'swapping';
		settleProgress = 0;
		swapStart = performance.now();
		const now = performance.now();

		// Restore hero point sizes
		material.uniforms.uPointSizeMin.value = HERO_POINT_MIN;
		material.uniforms.uPointSizeMax.value = HERO_POINT_MAX;

		// Retarget Casey particles back to hero
		retargetGroup(caseyParticles, caseyHeroPixels, now, SWAP_DURATION);
		// Retarget each nav group back to its nav position
		for (let i = 0; i < navParticles.length; i++) {
			retargetGroup(navParticles[i], navScalePixels[i], now, SWAP_DURATION);
		}
	}

	// ── Animation loop ──
	useTask(() => {
		if (caseyParticles.length === 0) return;

		const now = performance.now();

		material.uniforms.uSizeTime.value = now * SIZE_PULSE_SPEED;
		material.uniforms.uMouse.value.set(mouseX, mouseY);
		material.uniforms.uPulseTime.value = now * PULSE_WAVE_SPEED;

		// Mouse trigger (capped per frame to avoid first-hover burst)
		if (mouseEverSet && phase !== 'content') {
			let triggeredThisFrame = 0;
			for (const p of caseyParticles) {
				if (triggeredThisFrame >= MAX_TRIGGERS_PER_FRAME) break;
				if (!p.triggered) {
					const dx = p.homeX - mouseX;
					const dy = p.homeY - mouseY;
					if (dx * dx + dy * dy < RADIUS_SQ) {
						p.triggered = true;
						p.flyStart = now;
						triggeredThisFrame++;
					}
				}
			}
			for (const group of navParticles) {
				for (const p of group) {
					if (triggeredThisFrame >= MAX_TRIGGERS_PER_FRAME) break;
					if (!p.triggered) {
						const dx = p.homeX - mouseX;
						const dy = p.homeY - mouseY;
						if (dx * dx + dy * dy < RADIUS_SQ) {
							p.triggered = true;
							p.flyStart = now;
							triggeredThisFrame++;
						}
					}
				}
			}
		}

		// Process pending nav swap
		if (pendingSwap !== null) {
			const swapIdx = pendingSwap;
			pendingSwap = null;

			if (swapIdx === selectedNavIndex) {
				// Deselect: return to hero layout
				deselectContent();
			} else {
				// Select new nav item (works from idle or content state)
				selectContent(swapIdx);
			}
		}

		if (phase === 'swapping' && now > swapStart + SWAP_DURATION + 200) {
			phase = selectedNavIndex !== null ? 'content' : 'idle';
		}

		// Animate settle progress (offsets shrink, text becomes crisp)
		if (phase === 'content' && settleProgress < 1) {
			const elapsed = now - settleStart;
			if (elapsed > 0) {
				settleProgress = Math.min(elapsed / SETTLE_DURATION, 1);
				const s = easeOutCubic(settleProgress);
				// Interpolate point sizes from hero range toward content range
				material.uniforms.uPointSizeMin.value =
					HERO_POINT_MIN + (CONTENT_POINT_MIN - HERO_POINT_MIN) * s;
				material.uniforms.uPointSizeMax.value =
					HERO_POINT_MAX + (CONTENT_POINT_MAX - HERO_POINT_MAX) * s;
			}
		}

		const offsetScale = phase === 'content' ? 1 - easeOutCubic(settleProgress) : 1;

		// Update GPU buffers
		let idx = 0;
		for (const p of caseyParticles) {
			writeParticleToBuffers(p, now, positions, particleColors, alphas, idx++, offsetScale);
		}
		for (const group of navParticles) {
			for (const p of group) {
				writeParticleToBuffers(p, now, positions, particleColors, alphas, idx++, offsetScale);
			}
		}

		posAttr.needsUpdate = true;
		colorAttr.needsUpdate = true;
		alphaAttr.needsUpdate = true;
	});

	// ── Event handlers ──
	function isOverBackArrow(cx: number, cy: number): boolean {
		if (!backArrowBounds || phase !== 'content') return false;
		const b = backArrowBounds;
		return cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h;
	}

	function handleMouseMove(e: MouseEvent) {
		const rect = renderer.domElement.getBoundingClientRect();
		mouseX = e.clientX - rect.left;
		mouseY = e.clientY - rect.top;
		mouseEverSet = true;

		if (phase === 'content') {
			renderer.domElement.style.cursor = isOverBackArrow(mouseX, mouseY) ? 'pointer' : 'default';
		} else {
			const overNav = NAV_TEXTS.some(
				(_, i) =>
					Math.abs(mouseX - navCx[i]) < NAV_HIT_W / 2 &&
					Math.abs(mouseY - navCy) < NAV_HIT_H / 2
			);
			renderer.domElement.style.cursor = overNav ? 'pointer' : 'default';
		}
	}

	function handleClick(e: MouseEvent) {
		const rect = renderer.domElement.getBoundingClientRect();
		const cx = e.clientX - rect.left;
		const cy = e.clientY - rect.top;

		// Back arrow click in content mode
		if (isOverBackArrow(cx, cy)) {
			deselectContent();
			return;
		}

		// Nav item click (only in idle/hero state)
		if (phase === 'idle') {
			for (let i = 0; i < NAV_TEXTS.length; i++) {
				if (
					Math.abs(cx - navCx[i]) < NAV_HIT_W / 2 &&
					Math.abs(cy - navCy) < NAV_HIT_H / 2
				) {
					pendingSwap = i;
					break;
				}
			}
		}
	}

	$effect(() => {
		const el = renderer.domElement;
		el.addEventListener('mousemove', handleMouseMove);
		el.addEventListener('click', handleClick);
		return () => {
			el.removeEventListener('mousemove', handleMouseMove);
			el.removeEventListener('click', handleClick);
		};
	});

	$effect(() => {
		return () => {
			geometry.dispose();
			material.dispose();
		};
	});
</script>

<T is={pointsMesh} />
