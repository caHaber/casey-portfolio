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
			uPulseWaveAmplitude: { value: -10.72 }
		}
	});
}

