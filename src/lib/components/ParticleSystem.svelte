<script lang="ts">
	import { useTask, useThrelte } from '@threlte/core';
	import { T } from '@threlte/core';
	import { ShaderMaterial, BufferGeometry, BufferAttribute, Points } from 'three';
	import { interpolateCoolRGB } from '$lib/utils/color';
	import { getTextPixels, getTextPixelsAt } from '$lib/utils/textMask';
	import { navState } from '$lib/stores/nav.svelte';

	// ── Constants ──
	const CASEY_N = 300000;
	const NAV_N = 6000;
	const MOUSE_RADIUS = 130;
	const INTRO_FLY = 1250;
	const SWAP_DURATION = 1000;
	const TOTAL_N = CASEY_N + NAV_N * 3;

	const NAV_LABELS = ['projects', 'writing', 'about'];
	const NAV_Y_FRAC = 0.8;
	const NAV_X_FRACS = [0.2, 0.5, 0.8];
	const NAV_FONT_SIZE = 56;
	const NAV_HIT_W = 240;
	const NAV_HIT_H = 80;

	interface Point {
		x: number;
		y: number;
	}

	const POSITION_NOISE = 5; // pixels of random offset for organic look
	const IDLE_ALPHA = 0; // alpha when not triggered (was 40/255; higher so large points read as blue, not grey)

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
			cb: b / 255
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

	const geometry = new BufferGeometry();
	const posAttr = new BufferAttribute(positions, 3);
	const colorAttr = new BufferAttribute(particleColors, 3);
	const alphaAttr = new BufferAttribute(alphas, 1);
	geometry.setAttribute('position', posAttr);
	geometry.setAttribute('particleColor', colorAttr);
	geometry.setAttribute('alpha', alphaAttr);
	geometry.setDrawRange(0, 0); // nothing renders until initialized

	const vertexShader = /* glsl */ `
		attribute float alpha;
		attribute vec3 particleColor;
		varying vec4 vColor;
		uniform float uPointSize;

		void main() {
			vColor = vec4(particleColor, alpha);
			vec4 pos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			pos.y = -pos.y;
			gl_Position = pos;
			gl_PointSize = uPointSize;
		}
	`;

	const fragmentShader = /* glsl */ `
		varying vec4 vColor;
		void main() {
			gl_FragColor = vColor;
		}
	`;

	const material = new ShaderMaterial({
		vertexShader,
		fragmentShader,
		transparent: true,
		depthWrite: false,
		uniforms: {
			uPointSize: { value: 5.0 }
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

		// Measure nav label positions
		const measureCtx = document.createElement('canvas').getContext('2d')!;
		measureCtx.font = `100 ${NAV_FONT_SIZE}px system-ui, -apple-system, sans-serif`;

		navCy = H * NAV_Y_FRAC;
		navCx = NAV_LABELS.map((label, i) => {
			const textW = measureCtx.measureText(label).width;
			const rawX = W * NAV_X_FRACS[i];
			return Math.max(textW / 2 + 10, Math.min(W - textW / 2 - 10, rawX));
		});

		// Rasterize text targets
		caseyHeroPixels = getTextPixels('Casey', W, H, CASEY_N * 2);

		navScalePixels = NAV_LABELS.map((label, i) =>
			getTextPixelsAt(label, navCx[i], navCy, NAV_FONT_SIZE, W, H, NAV_N * 2)
		);

		heroNavPixels = NAV_LABELS.map((label) => {
			const fs = Math.floor((W * 0.65) / (label.length * 0.55));
			return getTextPixelsAt(label, W / 2, H * 0.38, fs, W, H, NAV_N * 2);
		});

		navCaseyPixels = navCx.map((cx) =>
			getTextPixelsAt('CASEY', cx, navCy, Math.floor(NAV_FONT_SIZE * 0.75), W, H, CASEY_N)
		);

		// Create casey particles
		caseyParticles = Array.from({ length: CASEY_N }, (_, i) => {
			const target = caseyHeroPixels[i % caseyHeroPixels.length];
			return makeParticle(Math.random() * W, Math.random() * H, target, target.x / W, INTRO_FLY);
		});

		// Create nav particles
		navParticles = NAV_LABELS.map((_, ni) => {
			const pixels = navScalePixels[ni];
			return Array.from({ length: NAV_N }, (_, i) => {
				const target = pixels[i % pixels.length];
				const colorT = ni / (NAV_LABELS.length - 1);
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
				idx++;
			}
		}

		posAttr.needsUpdate = true;
		colorAttr.needsUpdate = true;
		alphaAttr.needsUpdate = true;
		geometry.setDrawRange(0, TOTAL_N);
	});

	// ── Animation loop ──
	useTask(() => {
		if (caseyParticles.length === 0) return;

		const now = performance.now();
		const W = size.current.width;
		// const H = size.current.height;

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
				if (t < 1.0) {
					alpha = (IDLE_ALPHA * 255 + et * (255 - IDLE_ALPHA * 255)) / 255;
				} else {
					const pulse = 0.75 + 0.25 * Math.sin(now / 700 + (p.targetX / W) * Math.PI * 4);
					alpha = pulse;
				}
			}
			positions[idx * 3] = px + p.offsetX;
			positions[idx * 3 + 1] = py + p.offsetY;
			positions[idx * 3 + 2] = 0;
			alphas[idx] = alpha;
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
					p.x = px;
					p.y = py;
					particleColors[idx * 3] = p.cr;
					particleColors[idx * 3 + 1] = p.cg;
					particleColors[idx * 3 + 2] = p.cb;
					if (t < 1.0) {
						alpha = (IDLE_ALPHA * 255 + et * (255 - IDLE_ALPHA * 255)) / 255;
					} else {
						const pulse = 0.75 + 0.25 * Math.sin(now / 700 + (p.targetX / W) * Math.PI * 4);
						alpha = pulse;
					}
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
			(phase === 'idle' || phase === 'swapped') &&
			NAV_LABELS.some(
				(_, i) =>
					Math.abs(mouseX - navCx[i]) < NAV_HIT_W / 2 && Math.abs(mouseY - navCy) < NAV_HIT_H / 2
			);
		renderer.domElement.style.cursor = overNav ? 'pointer' : 'default';
	}

	function handleClick(e: MouseEvent) {
		if (phase === 'swapping') return;
		const rect = renderer.domElement.getBoundingClientRect();
		const cx = e.clientX - rect.left;
		const cy = e.clientY - rect.top;

		for (let i = 0; i < NAV_LABELS.length; i++) {
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
