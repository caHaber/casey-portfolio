<script lang="ts">
	import { interpolateCoolRGB } from '$lib/utils/color';
	import { getTextPixels } from '$lib/utils/textMask';

	// Timing from animation_old.js: phase1 = 1250ms, phase2 = 2250ms
	const PHASE1 = 1250; // fly from home to name position
	const PHASE2 = 2250; // settle / bloom at destination
	const MOUSE_RADIUS = 50; // orignal was 50
	const PARTICLE_COUNT = 50000; // original was 50000

	interface Particle {
		homeX: number;
		homeY: number;
		targetX: number;
		targetY: number;
		triggered: boolean;
		flyStart: number;
		cr: number; // precomputed palette color
		cg: number;
		cb: number;
	}

	let canvas = $state<HTMLCanvasElement | null>(null);
	let innerWidth = $state(0);
	let innerHeight = $state(0);

	function easeOutCubic(x: number) {
		return 1 - (1 - x) ** 3;
	}

	$effect(() => {
		if (!canvas || innerWidth <= 0 || innerHeight <= 0) return;

		const ctx = canvas.getContext('2d')!;
		const W = innerWidth;
		const H = innerHeight;

		// Rasterise name and collect target pixel positions
		const textPixels = getTextPixels('CASEY', W, H);
		if (textPixels.length === 0) return;

		// Build particles — each gets a random home and a sampled name target
		const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => {
			const target = textPixels[Math.floor(Math.random() * textPixels.length)];
			const colorT = target.x / W;
			const [cr, cg, cb] = interpolateCoolRGB(colorT);
			return {
				homeX: Math.random() * W,
				homeY: Math.random() * H,
				targetX: target.x,
				targetY: target.y,
				triggered: false,
				flyStart: 0,
				cr,
				cg,
				cb
			};
		});

		const RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;

		// Use putImageData for 1px-per-particle rendering (avoids per-draw-call overhead)
		const imgData = ctx.createImageData(W, H);
		const buf = imgData.data;
		const buf32 = new Uint32Array(buf.buffer);
		// Background #0a0a0a, alpha 255 — stored as little-endian ABGR: 0xff0a0a0a
		const BG32 = 0xff0a0a0a;

		let mouseX = -MOUSE_RADIUS * 2;
		let mouseY = -MOUSE_RADIUS * 2;

		function handleMouseMove(e: MouseEvent) {
			const rect = canvas!.getBoundingClientRect();
			mouseX = e.clientX - rect.left;
			mouseY = e.clientY - rect.top;
		}

		let rafId: number;

		function draw(now: number) {
			// Trigger particles within mouse radius (checked once per frame)
			for (const p of particles) {
				if (p.triggered) continue;
				const dx = p.homeX - mouseX;
				const dy = p.homeY - mouseY;
				if (dx * dx + dy * dy < RADIUS_SQ) {
					p.triggered = true;
					p.flyStart = now;
				}
			}

			// Fill background
			buf32.fill(BG32);

			for (const p of particles) {
				let px: number, py: number, alpha: number;

				if (!p.triggered) {
					// Idle: dim dot at home position
					px = p.homeX | 0;
					py = p.homeY | 0;
					if (px < 0 || px >= W || py < 0 || py >= H) continue;
					const idx = (py * W + px) * 4;
					buf[idx] = 96;
					buf[idx + 1] = 128;
					buf[idx + 2] = 192;
					buf[idx + 3] = 40; // ~16% opacity
				} else {
					const elapsed = now - p.flyStart;

					if (elapsed < PHASE1) {
						// Phase 1: fly home → target, easeOutCubic over 1250ms
						const t = easeOutCubic(elapsed / PHASE1);
						px = (p.homeX + (p.targetX - p.homeX) * t) | 0;
						py = (p.homeY + (p.targetY - p.homeY) * t) | 0;
						alpha = (40 + t * 215) | 0; // fades from ~16% to 100%
					} else if (elapsed < PHASE1 + PHASE2) {
						// Phase 2: bloom and settle at target over 2250ms
						const t = (elapsed - PHASE1) / PHASE2;
						px = p.targetX;
						py = p.targetY;
						// Brightness rises quickly then settles to a pulse
						const settle = easeOutCubic(Math.min(t * 2, 1));
						const pulse =
							0.8 + 0.2 * Math.sin((elapsed - PHASE1) / 500 + (p.targetX / W) * Math.PI * 2);
						alpha = (settle * pulse * 255) | 0;
					} else {
						// Settled: gentle ongoing pulse
						px = p.targetX;
						py = p.targetY;
						const pulse =
							0.75 + 0.25 * Math.sin((elapsed - PHASE1) / 700 + (p.targetX / W) * Math.PI * 2);
						alpha = (pulse * 255) | 0;
					}

					if (px < 0 || px >= W || py < 0 || py >= H) continue;
					const idx = (py * W + px) * 4;
					buf[idx] = p.cr;
					buf[idx + 1] = p.cg;
					buf[idx + 2] = p.cb;
					buf[idx + 3] = alpha;
				}
			}

			ctx.putImageData(imgData, 0, 0);
			rafId = requestAnimationFrame(draw);
		}

		window.addEventListener('mousemove', handleMouseMove);
		rafId = requestAnimationFrame(draw);

		return () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener('mousemove', handleMouseMove);
		};
	});
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<canvas bind:this={canvas} width={innerWidth} height={innerHeight} aria-hidden="true"></canvas>

<style>
	canvas {
		display: block;
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: #0a0a0a;
	}
</style>
