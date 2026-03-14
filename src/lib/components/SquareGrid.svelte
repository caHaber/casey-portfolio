<script lang="ts">
	import { interpolateCoolRGB } from '$lib/utils/color';
	import { getTextPixels, getTextPixelsAt } from '$lib/utils/textMask';

	interface Props {
		onselectednav?: (i: number | null) => void;
	}

	const { onselectednav }: Props = $props();

	// ── Constants ──
	const CASEY_N = 20000;
	const NAV_N = 3000;
	const MOUSE_RADIUS = 130;
	const INTRO_FLY = 1250;
	const SWAP_DURATION = 1000;

	const NAV_LABELS = ['PROJECTS', 'WRITING', 'ABOUT'];
	const NAV_Y_FRAC = 0.80;
	const NAV_X_FRACS = [0.2, 0.5, 0.8];
	const NAV_FONT_SIZE = 56;
	const NAV_HIT_W = 240;
	const NAV_HIT_H = 80;

	interface Point {
		x: number;
		y: number;
	}

	interface Particle {
		homeX: number; // random start position
		homeY: number;
		x: number; // current animated position
		y: number;
		targetX: number;
		targetY: number;
		triggered: boolean;
		flyStart: number;
		flyDuration: number;
		cr: number;
		cg: number;
		cb: number;
	}

	let canvas = $state<HTMLCanvasElement | null>(null);
	let innerWidth = $state(0);
	let innerHeight = $state(0);

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
		const [cr, cg, cb] = interpolateCoolRGB(Math.max(0, Math.min(1, colorT)));
		return {
			homeX,
			homeY,
			x: homeX,
			y: homeY,
			targetX: target.x,
			targetY: target.y,
			triggered: false,
			flyStart: 0,
			flyDuration,
			cr,
			cg,
			cb
		};
	}

	// On swap: retarget particles from their current position to new targets
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

	$effect(() => {
		if (!canvas || innerWidth <= 0 || innerHeight <= 0) return;

		// Use the canvas's actual CSS rendered size — not window.innerWidth/Height —
		// to avoid any mismatch caused by browser chrome, DPR quirks, or layout shifts.
		const W = canvas.clientWidth;
		const H = canvas.clientHeight;
		if (W <= 0 || H <= 0) return;

		// Set the pixel buffer to match the CSS render size exactly.
		canvas.width = W;
		canvas.height = H;

		const ctx = canvas.getContext('2d')!;

		// ── Compute safe nav positions using measureText ──
		const measureCtx = document.createElement('canvas').getContext('2d')!;
		measureCtx.font = `900 ${NAV_FONT_SIZE}px system-ui, -apple-system, sans-serif`;

		const navCy = H * NAV_Y_FRAC;
		const navCx = NAV_LABELS.map((label, i) => {
			const textW = measureCtx.measureText(label).width;
			const rawX = W * NAV_X_FRACS[i];
			// Clamp so text stays within canvas bounds
			return Math.max(textW / 2 + 10, Math.min(W - textW / 2 - 10, rawX));
		});

		// ── Rasterize all text targets ──
		const caseyHeroPixels = getTextPixels('Casey', W, H, CASEY_N * 2);

		const navScalePixels = NAV_LABELS.map((label, i) =>
			getTextPixelsAt(label, navCx[i], navCy, NAV_FONT_SIZE, W, H, NAV_N * 2)
		);

		const heroNavPixels = NAV_LABELS.map((label) => {
			// Use same font size formula as getTextPixels for CASEY
			const fs = Math.floor((W * 0.65) / (label.length * 0.55));
			return getTextPixelsAt(label, W / 2, H * 0.38, fs, W, H, NAV_N * 2);
		});

		const navCaseyPixels = navCx.map((cx) =>
			getTextPixelsAt(
				'CASEY',
				cx,
				navCy,
				Math.floor(NAV_FONT_SIZE * 0.75),
				W,
				H,
				CASEY_N
			)
		);

		// ── Create particle groups ──
		const caseyParticles: Particle[] = Array.from({ length: CASEY_N }, (_, i) => {
			const target = caseyHeroPixels[i % caseyHeroPixels.length];
			return makeParticle(Math.random() * W, Math.random() * H, target, target.x / W, INTRO_FLY);
		});

		const navParticles: Particle[][] = NAV_LABELS.map((_, ni) => {
			const pixels = navScalePixels[ni];
			return Array.from({ length: NAV_N }, (_, i) => {
				const target = pixels[i % pixels.length];
				// Each nav item gets a distinct hue band from the cool palette
				const colorT = ni / (NAV_LABELS.length - 1);
				return makeParticle(Math.random() * W, Math.random() * H, target, colorT, INTRO_FLY);
			});
		});

		// ── Render state ──
		type Phase = 'idle' | 'swapping' | 'swapped';
		let phase: Phase = 'idle';
		let selectedNavIndex: number | null = null;
		let pendingSwap: number | null = null;
		let swapStart = 0;

		const RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;
		let mouseX = -MOUSE_RADIUS * 2;
		let mouseY = -MOUSE_RADIUS * 2;

		const imgData = ctx.createImageData(W, H);
		const buf = imgData.data;
		const buf32 = new Uint32Array(buf.buffer);
		const BG32 = 0xff0a0a0a;

		function drawParticle(p: Particle, now: number) {
			if (!p.triggered) {
				// Idle: dim dot at home position
				const px = p.homeX | 0;
				const py = p.homeY | 0;
				if (px >= 0 && px < W && py >= 0 && py < H) {
					const idx = (py * W + px) * 4;
					buf[idx] = 96;
					buf[idx + 1] = 128;
					buf[idx + 2] = 192;
					buf[idx + 3] = 40;
				}
				return;
			}

			const elapsed = now - p.flyStart;
			const t = Math.min(elapsed / p.flyDuration, 1.0);
			const et = easeOutCubic(t);
			const px = (p.homeX + (p.targetX - p.homeX) * et) | 0;
			const py = (p.homeY + (p.targetY - p.homeY) * et) | 0;

			p.x = px;
			p.y = py;

			if (px < 0 || px >= W || py < 0 || py >= H) return;

			let alpha: number;
			if (t < 1.0) {
				alpha = (40 + et * 215) | 0;
			} else {
				const pulse = 0.75 + 0.25 * Math.sin(now / 700 + (p.targetX / W) * Math.PI * 4);
				alpha = (pulse * 255) | 0;
			}

			const idx = (py * W + px) * 4;
			buf[idx] = p.cr;
			buf[idx + 1] = p.cg;
			buf[idx + 2] = p.cb;
			buf[idx + 3] = alpha;
		}

		let rafId: number;

		function draw(now: number) {
			// ── Mouse trigger: fire all particles near cursor ──
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

			// ── Process swap ──
			if (pendingSwap !== null) {
				const swapIdx = pendingSwap;
				pendingSwap = null;
				swapStart = now;
				phase = 'swapping';

				if (swapIdx === selectedNavIndex) {
					// Re-click same item → return to original positions
					retargetGroup(caseyParticles, caseyHeroPixels, now, SWAP_DURATION);
					retargetGroup(navParticles[swapIdx], navScalePixels[swapIdx], now, SWAP_DURATION);
					selectedNavIndex = null;
					onselectednav?.(null);
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
					onselectednav?.(swapIdx);
				}
			}

			if (phase === 'swapping' && now > swapStart + SWAP_DURATION + 200) {
				phase = selectedNavIndex !== null ? 'swapped' : 'idle';
			}

			// ── Render ──
			buf32.fill(BG32);

			for (const p of caseyParticles) drawParticle(p, now);
			for (const group of navParticles) {
				for (const p of group) drawParticle(p, now);
			}

			ctx.putImageData(imgData, 0, 0);
			rafId = requestAnimationFrame(draw);
		}

		// ── Event handlers ──
		function handleMouseMove(e: MouseEvent) {
			const rect = canvas!.getBoundingClientRect();
			mouseX = e.clientX - rect.left;
			mouseY = e.clientY - rect.top;

			const overNav =
				(phase === 'idle' || phase === 'swapped') &&
				NAV_LABELS.some(
					(_, i) =>
						Math.abs(mouseX - navCx[i]) < NAV_HIT_W / 2 &&
						Math.abs(mouseY - navCy) < NAV_HIT_H / 2
				);
			canvas!.style.cursor = overNav ? 'pointer' : 'default';
		}

		function handleClick(e: MouseEvent) {
			if (phase === 'swapping') return;
			const rect = canvas!.getBoundingClientRect();
			const cx = e.clientX - rect.left;
			const cy = e.clientY - rect.top;

			for (let i = 0; i < NAV_LABELS.length; i++) {
				if (Math.abs(cx - navCx[i]) < NAV_HIT_W / 2 && Math.abs(cy - navCy) < NAV_HIT_H / 2) {
					pendingSwap = i;
					break;
				}
			}
		}

		canvas.addEventListener('mousemove', handleMouseMove);
		canvas.addEventListener('click', handleClick);
		rafId = requestAnimationFrame(draw);

		return () => {
			cancelAnimationFrame(rafId);
			canvas?.removeEventListener('mousemove', handleMouseMove);
			canvas?.removeEventListener('click', handleClick);
		};
	});
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<canvas bind:this={canvas} aria-hidden="true"></canvas>

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
