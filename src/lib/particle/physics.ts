import { interpolateCoolRGB } from '$lib/utils/color';
import type { Particle, Point } from './types';

const POSITION_NOISE = 5;

export const IDLE_ALPHA = 0.1;
export const IDLE_COLOR: [number, number, number] = [190 / 255, 180 / 255, 165 / 255];
export const AT_INITIAL_EPS = 2;

export function easeOutCubic(x: number): number {
	return 1 - (1 - x) ** 3;
}

export function makeParticle(
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
		initialHomeX: homeX,
		initialHomeY: homeY,
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

export function retargetGroup(
	particles: Particle[],
	targets: Point[],
	now: number,
	duration: number,
	staggerMs = 0
): void {
	for (let i = 0; i < particles.length; i++) {
		const target = targets[i % targets.length];
		const p = particles[i];
		p.homeX = p.x;
		p.homeY = p.y;
		p.targetX = target.x;
		p.targetY = target.y;
		p.triggered = true;
		p.flyStart = staggerMs > 0 ? now + Math.random() * staggerMs : now;
		p.flyDuration = duration;
	}
}

/**
 * Retarget each particle to a random point in a disc around its CURRENT position.
 * Used for the "puff" phase of a header→header transition: the old shape
 * dissolves into a cloud before crystallizing into the new shape.
 */
export function scatterGroup(
	particles: Particle[],
	now: number,
	radius: number,
	duration: number,
	staggerMs: number
): void {
	for (const p of particles) {
		const angle = Math.random() * Math.PI * 2;
		// Bias toward the outer half of the radius so particles actually disperse
		// rather than clumping at their start.
		const r = radius * (0.4 + Math.random() * 0.6);
		p.homeX = p.x;
		p.homeY = p.y;
		p.targetX = p.x + Math.cos(angle) * r;
		p.targetY = p.y + Math.sin(angle) * r;
		p.triggered = true;
		p.flyStart = staggerMs > 0 ? now + Math.random() * staggerMs : now;
		p.flyDuration = duration;
	}
}

export function resetGroupToInitial(
	particles: Particle[],
	now: number,
	duration: number,
	staggerMs: number
): void {
	for (const p of particles) {
		p.homeX = p.x;
		p.homeY = p.y;
		p.targetX = p.initialHomeX;
		p.targetY = p.initialHomeY;
		p.triggered = true;
		p.flyStart = now + Math.random() * staggerMs;
		p.flyDuration = duration;
	}
}

export function triggerNearMouse(
	particles: Particle[],
	mx: number,
	my: number,
	radiusSq: number,
	now: number,
	cap: number
): number {
	let count = 0;
	for (const p of particles) {
		if (count >= cap) break;
		if (!p.triggered) {
			const dx = p.homeX - mx;
			const dy = p.homeY - my;
			if (dx * dx + dy * dy < radiusSq) {
				p.triggered = true;
				p.flyStart = now;
				count++;
			}
		}
	}
	return count;
}

/**
 * Writes one particle's current animated state into the GPU typed arrays at index `idx`.
 * Handles both idle (untriggered) and flying (triggered) states, including the
 * "arrived back at initial home" reset check.
 */
export function writeParticleToBuffers(
	p: Particle,
	now: number,
	positions: Float32Array,
	colors: Float32Array,
	alphas: Float32Array,
	idx: number,
	offsetScale = 1.0
): void {
	let px: number, py: number, alpha: number;

	if (!p.triggered) {
		px = p.homeX;
		py = p.homeY;
		colors[idx * 3] = IDLE_COLOR[0];
		colors[idx * 3 + 1] = IDLE_COLOR[1];
		colors[idx * 3 + 2] = IDLE_COLOR[2];
		alpha = IDLE_ALPHA;
	} else {
		const elapsed = now - p.flyStart;
		const t = Math.min(elapsed / p.flyDuration, 1.0);
		const et = easeOutCubic(t);
		px = p.homeX + (p.targetX - p.homeX) * et;
		py = p.homeY + (p.targetY - p.homeY) * et;
		p.x = px;
		p.y = py;

		const atInitial =
			t >= 1.0 &&
			Math.abs(p.targetX - p.initialHomeX) < AT_INITIAL_EPS &&
			Math.abs(p.targetY - p.initialHomeY) < AT_INITIAL_EPS;

		if (atInitial) {
			p.triggered = false;
			p.homeX = p.initialHomeX;
			p.homeY = p.initialHomeY;
			colors[idx * 3] = IDLE_COLOR[0];
			colors[idx * 3 + 1] = IDLE_COLOR[1];
			colors[idx * 3 + 2] = IDLE_COLOR[2];
			alpha = IDLE_ALPHA;
		} else {
			colors[idx * 3] = p.cr;
			colors[idx * 3 + 1] = p.cg;
			colors[idx * 3 + 2] = p.cb;
			const twinkle = 0.3 + 0.7 * Math.sin(now * 0.0012 + p.twinklePhase);
			// Blend twinkle alpha toward solid when offsetScale < 1 (content settling)
			const baseAlpha = twinkle * 0.4;
			const settledAlpha = 0.55;
			alpha = baseAlpha + (settledAlpha - baseAlpha) * (1 - offsetScale);
		}
	}

	positions[idx * 3] = px + p.offsetX * offsetScale;
	positions[idx * 3 + 1] = py + p.offsetY * offsetScale;
	positions[idx * 3 + 2] = 0;
	alphas[idx] = alpha;
}
