import type { Phase } from './types';

export type { Phase } from './types';

export interface HitRegion {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface LinkRegion extends HitRegion {
	href: string;
}

export interface HitTester {
	setNavRegions(centers: number[], cy: number, hitW: number, hitH: number): void;
	setContentRegions(backArrow: HitRegion | null, links: LinkRegion[]): void;
	clearContentRegions(): void;
	hitNav(x: number, y: number): number | null;
	hitBackArrow(x: number, y: number): boolean;
	hitLink(x: number, y: number): LinkRegion | null;
	isOverInteractive(x: number, y: number, phase: Phase): boolean;
}

function hitTest(
	cx: number,
	cy: number,
	region: { x: number; y: number; w: number; h: number }
): boolean {
	return (
		cx >= region.x && cx <= region.x + region.w && cy >= region.y && cy <= region.y + region.h
	);
}

export function createHitTester(): HitTester {
	let navCenters: number[] = [];
	let navCy = 0;
	let navHitW = 0;
	let navHitH = 0;
	let backArrow: HitRegion | null = null;
	let links: LinkRegion[] = [];

	return {
		setNavRegions(centers, cy, hitW, hitH) {
			navCenters = centers;
			navCy = cy;
			navHitW = hitW;
			navHitH = hitH;
		},

		setContentRegions(ba, lk) {
			backArrow = ba;
			links = lk;
		},

		clearContentRegions() {
			backArrow = null;
			links = [];
		},

		hitNav(x, y) {
			for (let i = 0; i < navCenters.length; i++) {
				if (
					Math.abs(x - navCenters[i]) < navHitW / 2 &&
					Math.abs(y - navCy) < navHitH / 2
				) {
					return i;
				}
			}
			return null;
		},

		hitBackArrow(x, y) {
			return backArrow !== null && hitTest(x, y, backArrow);
		},

		hitLink(x, y) {
			for (const link of links) {
				if (hitTest(x, y, link)) return link;
			}
			return null;
		},

		isOverInteractive(x, y, phase) {
			if (phase === 'content') {
				return this.hitBackArrow(x, y) || this.hitLink(x, y) !== null;
			}
			return this.hitNav(x, y) !== null;
		}
	};
}
