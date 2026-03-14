<script lang="ts">
	import { useTask, useThrelte } from '@threlte/core';
	import { T } from '@threlte/core';
	import { ShaderMaterial, BufferGeometry, BufferAttribute, Points } from 'three';
	import { interpolateCoolRGB } from '$lib/utils/color';
	import { rasterizeText, type Point, type TextRasterOptions } from '$lib/utils/textMask';
	import { navState } from '$lib/stores/nav.svelte';

	// ── Constants ──
	const CASEY_N = 300000;
	const NAV_N = 60000;
	const MOUSE_RADIUS = 130;
	const INTRO_FLY = 1250;
	const SWAP_DURATION = 1000;
	const TOTAL_N = CASEY_N + NAV_N * 3;
	const NAV_HIT_W = 240;
	const NAV_HIT_H = 80;

	// ── Text targets: single place to define "draw this text here" ──
	/** Hero text (center of screen). Canvas size and center are set in $effect from W,H. */
	const HERO_TEXT: Omit<TextRasterOptions, 'canvasWidth' | 'canvasHeight' | 'centerX' | 'centerY'> = {
		text: 'Casey',
		widthFrac: 0.65,
		fontWeight: 900,
		maxSamples: CASEY_N * 2
	};

	/** Nav items: label, position hint (xFrac), and fontSize. Actual centerX is measured and clamped. */
	const NAV_TEXTS = [
		{ text: 'projects', xFrac: 0.2, yFrac: 0.8, fontSize: 56, maxParticles: NAV_N },
		{ text: 'writing', xFrac: 0.5, yFrac: 0.8, fontSize: 56, maxParticles: NAV_N },
		{ text: 'about', xFrac: 0.8, yFrac: 0.8, fontSize: 56, maxParticles: NAV_N }
	] as const;

	const POSITION_NOISE = 5; // pixels of random offset for organic look
	const IDLE_ALPHA = 2 / 255; // alpha when not triggered (was 40/255; higher so large points read as blue, not grey)
	const ROTATION_SPEED = 0.00015; // radians per ms (slow drift)

	interface Particle {
		homeX: number;
		homeY: number;
		x: number;
		y: number;
		targetX: number;
		targetY: number;
		offsetX: number;
		offsetY: number;
		triggered: boolean;
		flyStart: number;
		flyDuration: number;
		cr: number; // 0–1
		cg: number;
		cb: number;
		twinklePhase: number; // random 0..2π for unsynced individual twinkle
	}

	function easeOutCubic(x: number): number {
		return 1 - (1 - x) ** 3;
	}

	function makeParticle(
		homeX: number,
		homeY: number,
		target: Point,
		colorT: number,
		flyDuration: number
	): Particle {
		const [r, g, b] = interpolateCoolRGB(Math.max(0, Math.min(1, colorT)));
		const offsetX = (Math.random() - 0.5) * 2 * POSITION_NOISE;
		const offsetY = (Math.random() - 0.5) * 2 * POSITION_NOISE;
		return {
			homeX,
			homeY,
			x: homeX,
			y: homeY,
			targetX: target.x,
			targetY: target.y,
			offsetX,
			offsetY,
			triggered: false,
			flyStart: 0,
			flyDuration,
			cr: r / 255,
			cg: g / 255,
			cb: b / 255,
			twinklePhase: Math.random() * 2 * Math.PI
		};
	}

	function retargetGroup(particles: Particle[], targets: Point[], now: number, duration: number) {
		for (let i = 0; i < particles.length; i++) {
			const target = targets[i % targets.length];
			const p = particles[i];
			p.homeX = p.x;
			p.homeY = p.y;
			p.targetX = target.x;
			p.targetY = target.y;
			p.triggered = true;
			p.flyStart = now;
			p.flyDuration = duration;
		}
	}

	// ── Threlte context ──
	const { size, renderer } = useThrelte();

	// ── GPU buffers (pre-allocated, fixed size) ──
	const positions = new Float32Array(TOTAL_N * 3);
	const particleColors = new Float32Array(TOTAL_N * 3);
	const alphas = new Float32Array(TOTAL_N);

	const pointSizeScales = new Float32Array(TOTAL_N);
	const rotations = new Float32Array(TOTAL_N);

	const geometry = new BufferGeometry();
	const posAttr = new BufferAttribute(positions, 3);
	const colorAttr = new BufferAttribute(particleColors, 3);
	const alphaAttr = new BufferAttribute(alphas, 1);
	const pointSizeAttr = new BufferAttribute(pointSizeScales, 1);
	const rotationAttr = new BufferAttribute(rotations, 1);
	geometry.setAttribute('position', posAttr);
	geometry.setAttribute('particleColor', colorAttr);
	geometry.setAttribute('alpha', alphaAttr);
	geometry.setAttribute('pointSizeScale', pointSizeAttr);
	geometry.setAttribute('rotation', rotationAttr);
	geometry.setDrawRange(0, 0); // nothing renders until initialized

	const vertexShader = /* glsl */ `
		attribute float alpha;
		attribute vec3 particleColor;
		attribute float pointSizeScale;
		attribute float rotation;
		varying vec4 vColor;
		varying float vRotation;
		uniform float uPointSizeMin;
		uniform float uPointSizeMax;
		uniform float uRotationTime;

		void main() {
			vColor = vec4(particleColor, alpha);
			vRotation = rotation + uRotationTime;
			vec4 pos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			pos.y = -pos.y;
			gl_Position = pos;
			float size = uPointSizeMin + pointSizeScale * (uPointSizeMax - uPointSizeMin);
			gl_PointSize = size;
		}
	`;

	const fragmentShader = /* glsl */ `
		varying vec4 vColor;
		varying float vRotation;

		void main() {
			vec2 uv = gl_PointCoord - 0.5;
			float c = cos(-vRotation);
			float s = sin(-vRotation);
			uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
			// Slightly elliptical so per-point rotation is visible
			float d = length(uv / vec2(1.25, 0.75));
			// float d
			if (d > 0.5) discard;
			gl_FragColor = vColor;
		}
	`;

	const material = new ShaderMaterial({
		vertexShader,
		fragmentShader,
		transparent: true,
		depthWrite: false,
		uniforms: {
			uPointSizeMin: { value: 1.0 },
			uPointSizeMax: { value: 10.0 },
			uRotationTime: { value: 0.0 }
		}
	});

	const pointsMesh = new Points(geometry, material);

	// ── Particle state (rebuilt on resize) ──
	let caseyParticles: Particle[] = [];
	let navParticles: Particle[][] = [[], [], []];
	let navCx: number[] = [0, 0, 0];
	let navCy = 0;

	// Precomputed pixel sets
	let caseyHeroPixels: Point[] = [];
	let navScalePixels: Point[][] = [[], [], []];
	let heroNavPixels: Point[][] = [[], [], []];
	let navCaseyPixels: Point[][] = [[], [], []];

	// Render state
	type Phase = 'idle' | 'swapping' | 'swapped';
	let phase: Phase = 'idle';
	let selectedNavIndex: number | null = null;
	let pendingSwap: number | null = null;
	let swapStart = 0;

	const RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;
	let mouseX = -MOUSE_RADIUS * 2;
	let mouseY = -MOUSE_RADIUS * 2;

	// ── Initialize particles on size change ──
	$effect(() => {
		const W = $size.width;
		const H = $size.height;
		if (W <= 0 || H <= 0) return;

		// Reset render state
		phase = 'idle';
		selectedNavIndex = null;
		pendingSwap = null;
		navState.selectedIndex = null;

		// Measure nav label positions (clamp so text stays on screen)
		const measureCtx = document.createElement('canvas').getContext('2d')!;
		navCy = H * NAV_TEXTS[0].yFrac;
		navCx = NAV_TEXTS.map((item) => {
			measureCtx.font = `100 ${item.fontSize}px system-ui, -apple-system, sans-serif`;
			const textW = measureCtx.measureText(item.text).width;
			const rawX = W * item.xFrac;
			return Math.max(textW / 2 + 10, Math.min(W - textW / 2 - 10, rawX));
		});

		// Rasterize all text targets (single API: "draw this text here")
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

		heroNavPixels = NAV_TEXTS.map((item) =>
			rasterizeText({
				text: item.text,
				canvasWidth: W,
				canvasHeight: H,
				centerX: W / 2,
				centerY: H * 0.38,
				widthFrac: 0.65,
				maxSamples: item.maxParticles * 2
			})
		);

		navCaseyPixels = navCx.map((cx, i) =>
			rasterizeText({
				text: 'CASEY',
				canvasWidth: W,
				canvasHeight: H,
				centerX: cx,
				centerY: navCy,
				fontSize: Math.floor(NAV_TEXTS[i].fontSize * 0.75),
				maxSamples: CASEY_N
			})
		);

		// Create casey particles
		caseyParticles = Array.from({ length: CASEY_N }, (_, i) => {
			const target = caseyHeroPixels[i % caseyHeroPixels.length];
			return makeParticle(Math.random() * W, Math.random() * H, target, target.x / W, INTRO_FLY);
		});

		// Create nav particles
		navParticles = NAV_TEXTS.map((_, ni) => {
			const pixels = navScalePixels[ni];
			return Array.from({ length: NAV_N }, (_, i) => {
				const target = pixels[i % pixels.length];
				const colorT = ni / (NAV_TEXTS.length - 1);
				return makeParticle(Math.random() * W, Math.random() * H, target, colorT, INTRO_FLY);
			});
		});

		// Set initial GPU buffer values
		let idx = 0;
		for (const p of caseyParticles) {
			positions[idx * 3] = p.homeX + p.offsetX;
			positions[idx * 3 + 1] = p.homeY + p.offsetY;
			positions[idx * 3 + 2] = 0;
			particleColors[idx * 3] = 96 / 255;
			particleColors[idx * 3 + 1] = 128 / 255;
			particleColors[idx * 3 + 2] = 192 / 255;
			alphas[idx] = IDLE_ALPHA;
			pointSizeScales[idx] = Math.random();
			rotations[idx] = Math.random() * 6.28318530718;
			idx++;
		}
		for (const group of navParticles) {
			for (const p of group) {
				positions[idx * 3] = p.homeX + p.offsetX;
				positions[idx * 3 + 1] = p.homeY + p.offsetY;
				positions[idx * 3 + 2] = 0;
				particleColors[idx * 3] = 96 / 255;
				particleColors[idx * 3 + 1] = 128 / 255;
				particleColors[idx * 3 + 2] = 192 / 255;
				alphas[idx] = IDLE_ALPHA;
				pointSizeScales[idx] = Math.random();
				rotations[idx] = Math.random() * 6.28318530718;
				idx++;
			}
		}

		posAttr.needsUpdate = true;
		colorAttr.needsUpdate = true;
		alphaAttr.needsUpdate = true;
		pointSizeAttr.needsUpdate = true;
		rotationAttr.needsUpdate = true;
		geometry.setDrawRange(0, TOTAL_N);
	});

	// ── Animation loop ──
	useTask(() => {
		if (caseyParticles.length === 0) return;

		const now = performance.now();

		material.uniforms.uRotationTime.value = now * ROTATION_SPEED;

		// Mouse trigger
		for (const p of caseyParticles) {
			if (!p.triggered) {
				const dx = p.homeX - mouseX;
				const dy = p.homeY - mouseY;
				if (dx * dx + dy * dy < RADIUS_SQ) {
					p.triggered = true;
					p.flyStart = now;
				}
			}
		}
		for (const group of navParticles) {
			for (const p of group) {
				if (!p.triggered) {
					const dx = p.homeX - mouseX;
					const dy = p.homeY - mouseY;
					if (dx * dx + dy * dy < RADIUS_SQ) {
						p.triggered = true;
						p.flyStart = now;
					}
				}
			}
		}

		// Process swap
		if (pendingSwap !== null) {
			const swapIdx = pendingSwap;
			pendingSwap = null;
			swapStart = now;
			phase = 'swapping';

			if (swapIdx === selectedNavIndex) {
				retargetGroup(caseyParticles, caseyHeroPixels, now, SWAP_DURATION);
				retargetGroup(navParticles[swapIdx], navScalePixels[swapIdx], now, SWAP_DURATION);
				selectedNavIndex = null;
				navState.selectedIndex = null;
			} else {
				if (selectedNavIndex !== null) {
					retargetGroup(
						navParticles[selectedNavIndex],
						navScalePixels[selectedNavIndex],
						now,
						SWAP_DURATION
					);
				}
				retargetGroup(caseyParticles, navCaseyPixels[swapIdx], now, SWAP_DURATION);
				retargetGroup(navParticles[swapIdx], heroNavPixels[swapIdx], now, SWAP_DURATION);
				selectedNavIndex = swapIdx;
				navState.selectedIndex = swapIdx;
			}
		}

		if (phase === 'swapping' && now > swapStart + SWAP_DURATION + 200) {
			phase = selectedNavIndex !== null ? 'swapped' : 'idle';
		}

		// Update GPU buffers
		let idx = 0;
		for (const p of caseyParticles) {
			let px: number, py: number, alpha: number;
			if (!p.triggered) {
				px = p.homeX;
				py = p.homeY;
				particleColors[idx * 3] = 96 / 255;
				particleColors[idx * 3 + 1] = 128 / 255;
				particleColors[idx * 3 + 2] = 192 / 255;
				alpha = IDLE_ALPHA;
			} else {
				const elapsed = now - p.flyStart;
				const t = Math.min(elapsed / p.flyDuration, 1.0);
				const et = easeOutCubic(t);
				px = p.homeX + (p.targetX - p.homeX) * et;
				py = p.homeY + (p.targetY - p.homeY) * et;
				p.x = px;
				p.y = py;
				particleColors[idx * 3] = p.cr;
				particleColors[idx * 3 + 1] = p.cg;
				particleColors[idx * 3 + 2] = p.cb;
				// if (t < 1.0) {
				// 	alpha = (IDLE_ALPHA * 255 + et * (255 - IDLE_ALPHA * 255)) / 255;
				// } else {
					// Slow individual twinkle: each particle has its own phase, ~8s period
					const twinkle = 0.5 + 0.5 * Math.sin(now * 0.0008 + p.twinklePhase);
					alpha = twinkle / 10;
				// }
			}
			positions[idx * 3] = px + p.offsetX;
			positions[idx * 3 + 1] = py + p.offsetY;
			positions[idx * 3 + 2] = 0;
			alphas[idx] = alpha;
			rotations[idx] = rotations[idx] + 1;
			idx++;
		}
		for (const group of navParticles) {
			for (const p of group) {
				let px: number, py: number, alpha: number;
				if (!p.triggered) {
					px = p.homeX;
					py = p.homeY;
					particleColors[idx * 3] = 96 / 255;
					particleColors[idx * 3 + 1] = 128 / 255;
					particleColors[idx * 3 + 2] = 192 / 255;
					alpha = IDLE_ALPHA;
				} else {
					const elapsed = now - p.flyStart;
					const t = Math.min(elapsed / p.flyDuration, 1.0);
					const et = easeOutCubic(t);
					px = p.homeX + (p.targetX - p.homeX) * et;
					py = p.homeY + (p.targetY - p.homeY) * et;
					p.x = px + Math.random() * 100;
					p.y = py + Math.random() * 100;
					particleColors[idx * 3] = p.cr;
					particleColors[idx * 3 + 1] = p.cg;
					particleColors[idx * 3 + 2] = p.cb;
					// if (t < 1.0) {
					// 	alpha = (IDLE_ALPHA * 255 + et * (255 - IDLE_ALPHA * 255)) / 255;
					// } else {
						// Slow individual twinkle: each particle has its own phase, ~8s period
						const twinkle = 0.5 + 0.5 * Math.sin(now * 0.0008 + p.twinklePhase);
						alpha = twinkle / 10;
					// }
				}
				positions[idx * 3] = px + p.offsetX;
				positions[idx * 3 + 1] = py + p.offsetY;
				positions[idx * 3 + 2] = 0;
				alphas[idx] = alpha;
				idx++;
			}
		}

		posAttr.needsUpdate = true;
		colorAttr.needsUpdate = true;
		alphaAttr.needsUpdate = true;
	});

	// ── Event handlers ──
	function handleMouseMove(e: MouseEvent) {
		const rect = renderer.domElement.getBoundingClientRect();
		mouseX = e.clientX - rect.left;
		mouseY = e.clientY - rect.top;

		const overNav =
			NAV_TEXTS.some(
				(_, i) =>
					Math.abs(mouseX - navCx[i]) < NAV_HIT_W / 2 && Math.abs(mouseY - navCy) < NAV_HIT_H / 2
			);
		renderer.domElement.style.cursor = overNav ? 'pointer' : 'default';
	}

	function handleClick(e: MouseEvent) {
		// if (phase === 'swapping') return;
		const rect = renderer.domElement.getBoundingClientRect();
		const cx = e.clientX - rect.left;
		const cy = e.clientY - rect.top;

		for (let i = 0; i < NAV_TEXTS.length; i++) {
			if (Math.abs(cx - navCx[i]) < NAV_HIT_W / 2 && Math.abs(cy - navCy) < NAV_HIT_H / 2) {
				pendingSwap = i;
				break;
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
