<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { Points, BufferGeometry, BufferAttribute } from 'three';
	import { getParticleContext } from '$lib/particle/context.svelte';
	import { createContentMaterial } from '$lib/particle/shaders';
	import { renderMarkdownToPixels } from '$lib/utils/markdownPixels';
	import type { Point } from '$lib/particle/types';

	import aboutRaw from '$lib/docs/about.svx?raw';
	import projectsRaw from '$lib/docs/projects.svx?raw';
	import writingRaw from '$lib/docs/writing.svx?raw';

	// Matches nav order: Projects (0), Writing (1), About (2)
	const DOCS = [projectsRaw, writingRaw, aboutRaw];

	const BASE_FONT = 12;
	const MAX_POINTS = 400_000;
	const FLY_IN_DURATION = 1_200; // ms — particles coalesce into text
	const FLY_OUT_DURATION = 600; // ms — particles scatter away
	const COLOR_R = 140 / 255;
	const COLOR_G = 170 / 255;
	const COLOR_B = 230 / 255;
	const SIZE_PULSE_SPEED = 0.0012;

	const ctx = getParticleContext();
	const { size } = useThrelte();

	// ── GPU buffers ──
	const positions = new Float32Array(MAX_POINTS * 3);
	const particleColors = new Float32Array(MAX_POINTS * 3);
	const alphas = new Float32Array(MAX_POINTS);
	const pointSizeScales = new Float32Array(MAX_POINTS);
	const sizePhases = new Float32Array(MAX_POINTS);
	const scatterPositions = new Float32Array(MAX_POINTS * 3);
	const staggerPhases = new Float32Array(MAX_POINTS);

	const geometry = new BufferGeometry();
	const posAttr = new BufferAttribute(positions, 3);
	const colorAttr = new BufferAttribute(particleColors, 3);
	const alphaAttr = new BufferAttribute(alphas, 1);
	const pointSizeAttr = new BufferAttribute(pointSizeScales, 1);
	const sizePhaseAttr = new BufferAttribute(sizePhases, 1);
	const scatterAttr = new BufferAttribute(scatterPositions, 3);
	const staggerAttr = new BufferAttribute(staggerPhases, 1);

	geometry.setAttribute('position', posAttr);
	geometry.setAttribute('particleColor', colorAttr);
	geometry.setAttribute('alpha', alphaAttr);
	geometry.setAttribute('pointSizeScale', pointSizeAttr);
	geometry.setAttribute('sizePhase', sizePhaseAttr);
	geometry.setAttribute('aScatter', scatterAttr);
	geometry.setAttribute('aStaggerPhase', staggerAttr);
	geometry.setDrawRange(0, 0);

	const material = createContentMaterial();
	const pointsMesh = new Points(geometry, material);

	// ── Fly animation state ──
	type FlyPhase = 'hidden' | 'flying-in' | 'visible' | 'flying-out';
	let flyPhase: FlyPhase = 'hidden';
	let flyProgress = 0; // 0 = scatter, 1 = at text positions
	let flyPhaseStart = 0;
	let activeCount = 0;
	// Holds pixels from a newly resolved render while fly-out of old content is still running
	let pendingPixels: Point[] | null = null;
	let pendingW = 0;
	let pendingH = 0;

	let generation = 0;

	function uploadContent(pixels: Point[], W: number, H: number) {
		const count = Math.min(pixels.length, MAX_POINTS);
		for (let i = 0; i < count; i++) {
			// Text target positions
			positions[i * 3] = pixels[i].x;
			positions[i * 3 + 1] = pixels[i].y;
			positions[i * 3 + 2] = 0;
			// Color
			particleColors[i * 3] = COLOR_R;
			particleColors[i * 3 + 1] = COLOR_G;
			particleColors[i * 3 + 2] = COLOR_B;
			alphas[i] = 1;
			// Per-particle size variation
			pointSizeScales[i] = Math.random();
			sizePhases[i] = Math.random() * 2 * Math.PI;
			// Scatter: random screen position the particle flies in from
			scatterPositions[i * 3] = Math.random() * W;
			scatterPositions[i * 3 + 1] = Math.random() * H;
			scatterPositions[i * 3 + 2] = 0;
			// Per-particle stagger (controls when it starts moving during fly-in)
			staggerPhases[i] = Math.random();
		}
		posAttr.needsUpdate = true;
		colorAttr.needsUpdate = true;
		alphaAttr.needsUpdate = true;
		pointSizeAttr.needsUpdate = true;
		sizePhaseAttr.needsUpdate = true;
		scatterAttr.needsUpdate = true;
		staggerAttr.needsUpdate = true;

		activeCount = count;
		geometry.setDrawRange(0, count);
		flyProgress = 0;
		flyPhaseStart = performance.now();
		flyPhase = 'flying-in';
	}

	// ── React to nav selection ──
	$effect(() => {
		const idx = ctx.selectedIndex;
		const W = $size.width;
		const H = $size.height;

		generation++;
		const gen = generation;

		if (idx === null) {
			// Nav deselected — fly out current content
			pendingPixels = null;
			if (flyPhase === 'visible' || flyPhase === 'flying-in') {
				flyPhaseStart = performance.now();
				flyPhase = 'flying-out';
			}
			return;
		}

		// Nav selected — begin loading (runs in parallel with any ongoing fly-out)
		const displayW = Math.min(520, Math.round(W * 0.8));
		const x0 = Math.round((W - displayW) / 2);
		const y0 = Math.round(H * 0.16);

		renderMarkdownToPixels(DOCS[idx], W, H, x0, y0, displayW, BASE_FONT).then((pixels) => {
			if (gen !== generation) return; // stale result from a superseded nav selection

			if (flyPhase === 'hidden') {
				uploadContent(pixels, W, H);
			} else {
				// Currently visible or flying — store as pending; the useTask loop will
				// upload it once the fly-out completes.
				pendingPixels = pixels;
				pendingW = W;
				pendingH = H;
				if (flyPhase === 'visible' || flyPhase === 'flying-in') {
					flyPhaseStart = performance.now();
					flyPhase = 'flying-out';
				}
			}
		});
	});

	// ── Animation loop ──
	useTask(() => {
		const now = performance.now();
		material.uniforms.uSizeTime.value = now * SIZE_PULSE_SPEED;

		if (flyPhase === 'flying-in') {
			flyProgress = Math.min((now - flyPhaseStart) / FLY_IN_DURATION, 1);
			if (flyProgress >= 1) {
				flyProgress = 1;
				flyPhase = 'visible';
			}
		} else if (flyPhase === 'flying-out') {
			const outT = Math.min((now - flyPhaseStart) / FLY_OUT_DURATION, 1);
			flyProgress = 1 - outT;
			if (outT >= 1) {
				flyProgress = 0;
				flyPhase = 'hidden';
				geometry.setDrawRange(0, 0);
				activeCount = 0;
				// Upload pending content that arrived during the fly-out
				if (pendingPixels !== null) {
					uploadContent(pendingPixels, pendingW, pendingH);
					pendingPixels = null;
				}
			}
		}

		material.uniforms.uFlyProgress.value = flyProgress;
	});

	$effect(() => {
		return () => {
			geometry.dispose();
			material.dispose();
		};
	});
</script>

<T is={pointsMesh} />
