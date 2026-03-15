import { ShaderMaterial, Vector2 } from 'three';

export const particleFragmentShader = /* glsl */ `
	varying vec4 vColor;
	void main() {
		vec2 uv = gl_PointCoord - 0.5;
		if (length(uv) > 0.5) discard;
		gl_FragColor = vColor;
	}
`;

/** Vertex shader for hero/nav particles with mouse-proximity wave effect. */
export const heroVertexShader = /* glsl */ `
	attribute float alpha;
	attribute vec3 particleColor;
	attribute float pointSizeScale;
	attribute float sizePhase;
	varying vec4 vColor;
	uniform float uPointSizeMin;
	uniform float uPointSizeMax;
	uniform float uSizeTime;
	uniform vec2 uMouse;
	uniform float uPulseRadius;
	uniform float uPulseTime;
	uniform float uPulseWaveAmplitude;

	void main() {
		vColor = vec4(particleColor, alpha);
		vec4 pos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		pos.y = -pos.y;
		gl_Position = pos;

		float baseSize = uPointSizeMin + pointSizeScale * (uPointSizeMax - uPointSizeMin);
		float sizeAnim = 0.5 + 0.5 * sin(uSizeTime + sizePhase);
		gl_PointSize = baseSize * sizeAnim;

		float dist = length(position.xy - uMouse);
		float inZone = 1.0 - smoothstep(uPulseRadius * 0.65, uPulseRadius, dist);
		float wave = sin(uPulseTime - dist * 0.035) * uPulseWaveAmplitude * inZone;
		gl_PointSize *= 1.0 + wave;
	}
`;

/**
 * Vertex shader for content (markdown) particles.
 * Animates between a scatter position (aScatter) and the text pixel position
 * using uFlyProgress (0 = scattered, 1 = at text). Each particle has its own
 * stagger phase so they don't all move at once.
 */
export const contentVertexShader = /* glsl */ `
	attribute float alpha;
	attribute vec3 particleColor;
	attribute float pointSizeScale;
	attribute float sizePhase;
	attribute vec3 aScatter;
	attribute float aStaggerPhase;
	varying vec4 vColor;
	uniform float uPointSizeMin;
	uniform float uPointSizeMax;
	uniform float uSizeTime;
	uniform float uFlyProgress;

	void main() {
		vColor = vec4(particleColor, alpha);

		// Per-particle staggered easing: particles start moving at different times
		float t = clamp((uFlyProgress - aStaggerPhase * 0.25) / 0.75, 0.0, 1.0);
		float eased = 1.0 - pow(1.0 - t, 3.0);

		vec3 actualPos = mix(aScatter, position, eased);
		vec4 pos = projectionMatrix * modelViewMatrix * vec4(actualPos, 1.0);
		pos.y = -pos.y;
		gl_Position = pos;

		float baseSize = uPointSizeMin + pointSizeScale * (uPointSizeMax - uPointSizeMin);
		float sizeAnim = 0.5 + 0.5 * sin(uSizeTime + sizePhase);
		gl_PointSize = baseSize * sizeAnim;
	}
`;

export function createHeroMaterial(pulseRadius: number): ShaderMaterial {
	return new ShaderMaterial({
		vertexShader: heroVertexShader,
		fragmentShader: particleFragmentShader,
		transparent: true,
		depthWrite: false,
		uniforms: {
			uPointSizeMin: { value: 2.0 },
			uPointSizeMax: { value: 10.0 },
			uSizeTime: { value: 0.0 },
			uMouse: { value: new Vector2(-1000, -1000) },
			uPulseRadius: { value: pulseRadius },
			uPulseTime: { value: 0.0 },
			uPulseWaveAmplitude: { value: 10.72 }
		}
	});
}

export function createContentMaterial(): ShaderMaterial {
	return new ShaderMaterial({
		vertexShader: contentVertexShader,
		fragmentShader: particleFragmentShader,
		transparent: true,
		depthWrite: false,
		uniforms: {
			uPointSizeMin: { value: 2.5 },
			uPointSizeMax: { value: 6.0 },
			uSizeTime: { value: 0.0 },
			uFlyProgress: { value: 0.0 }
		}
	});
}
