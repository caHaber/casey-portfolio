import { BufferGeometry, BufferAttribute } from 'three';
import type { Particle } from './types';
import { writeParticleToBuffers } from './physics';

export interface ParticleBuffers {
	geometry: BufferGeometry;
	uploadInitial(particles: Particle[]): void;
	uploadFrame(particles: Particle[], now: number, offsetScale: number): void;
	activate(count: number): void;
	dispose(): void;
}

export function createParticleBuffers(totalCount: number): ParticleBuffers {
	const positions = new Float32Array(totalCount * 3);
	const particleColors = new Float32Array(totalCount * 3);
	const alphas = new Float32Array(totalCount);
	const pointSizeScales = new Float32Array(totalCount);
	const sizePhases = new Float32Array(totalCount);

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

	return {
		geometry,

		uploadInitial(particles) {
			for (let idx = 0; idx < particles.length; idx++) {
				const p = particles[idx];
				positions[idx * 3] = p.homeX + p.offsetX;
				positions[idx * 3 + 1] = p.homeY + p.offsetY;
				positions[idx * 3 + 2] = 0;
				particleColors[idx * 3] = 190 / 255;
				particleColors[idx * 3 + 1] = 180 / 255;
				particleColors[idx * 3 + 2] = 165 / 255;
				alphas[idx] = 0.1;
				pointSizeScales[idx] = Math.random();
				sizePhases[idx] = Math.random() * 6.28318530718;
			}
			posAttr.needsUpdate = true;
			colorAttr.needsUpdate = true;
			alphaAttr.needsUpdate = true;
			pointSizeAttr.needsUpdate = true;
			sizePhaseAttr.needsUpdate = true;
		},

		uploadFrame(particles, now, offsetScale) {
			for (let idx = 0; idx < particles.length; idx++) {
				writeParticleToBuffers(
					particles[idx],
					now,
					positions,
					particleColors,
					alphas,
					idx,
					offsetScale
				);
			}
			posAttr.needsUpdate = true;
			colorAttr.needsUpdate = true;
			alphaAttr.needsUpdate = true;
		},

		activate(count) {
			geometry.setDrawRange(0, count);
		},

		dispose() {
			geometry.dispose();
		}
	};
}
