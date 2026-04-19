export type { Point } from '$lib/utils/textMask';

export type Phase = 'idle' | 'swapping' | 'content';

export interface Particle {
	homeX: number;
	homeY: number;
	initialHomeX: number;
	initialHomeY: number;
	x: number;
	y: number;
	targetX: number;
	targetY: number;
	offsetX: number;
	offsetY: number;
	triggered: boolean;
	flyStart: number;
	flyDuration: number;
	cr: number;
	cg: number;
	cb: number;
	twinklePhase: number;
}
