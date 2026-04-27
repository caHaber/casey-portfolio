<script lang="ts">
	import { useTask, useThrelte } from '@threlte/core';
	import { T } from '@threlte/core';
	import { Points, BufferGeometry, BufferAttribute, ShaderMaterial } from 'three';

	// ── Config ──
	const ICON_SIZE = 36;
	const SPACING = 56;
	const SIDEBAR_X = 32;
	const MAX_PARTICLES = 6000;
	const POINT_SIZE_MIN = 2.0;
	const POINT_SIZE_MAX = 4.5;

	// Blue color matching the site's link color (#2b5c8a)
	const BLUE_R = 0.17;
	const BLUE_G = 0.36;
	const BLUE_B = 0.54;

	const { size } = useThrelte();

	// ── Buffers ──
	const positions = new Float32Array(MAX_PARTICLES * 3);
	const colors = new Float32Array(MAX_PARTICLES * 3);
	const alphas = new Float32Array(MAX_PARTICLES);
	const pointSizes = new Float32Array(MAX_PARTICLES);
	const sizePhases = new Float32Array(MAX_PARTICLES);

	const geometry = new BufferGeometry();
	const posAttr = new BufferAttribute(positions, 3);
	const colorAttr = new BufferAttribute(colors, 3);
	const alphaAttr = new BufferAttribute(alphas, 1);
	const sizeAttr = new BufferAttribute(pointSizes, 1);
	const phaseAttr = new BufferAttribute(sizePhases, 1);
	geometry.setAttribute('position', posAttr);
	geometry.setAttribute('particleColor', colorAttr);
	geometry.setAttribute('alpha', alphaAttr);
	geometry.setAttribute('pointSizeScale', sizeAttr);
	geometry.setAttribute('sizePhase', phaseAttr);
	geometry.setDrawRange(0, 0);

	const vertexShader = /* glsl */ `
		attribute float alpha;
		attribute vec3 particleColor;
		attribute float pointSizeScale;
		attribute float sizePhase;
		varying vec4 vColor;
		uniform float uPointSizeMin;
		uniform float uPointSizeMax;
		uniform float uSizeTime;

		void main() {
			vColor = vec4(particleColor, alpha);
			vec4 pos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			pos.y = -pos.y;
			gl_Position = pos;

			float baseSize = uPointSizeMin + pointSizeScale * (uPointSizeMax - uPointSizeMin);
			float sizeAnim = 0.7 + 0.3 * sin(uSizeTime + sizePhase);
			gl_PointSize = baseSize * sizeAnim;
		}
	`;

	const fragmentShader = /* glsl */ `
		varying vec4 vColor;
		void main() {
			vec2 uv = gl_PointCoord - 0.5;
			if (length(uv) > 0.5) discard;
			gl_FragColor = vColor;
		}
	`;

	const material = new ShaderMaterial({
		vertexShader,
		fragmentShader,
		transparent: true,
		depthWrite: false,
		uniforms: {
			uPointSizeMin: { value: POINT_SIZE_MIN },
			uPointSizeMax: { value: POINT_SIZE_MAX },
			uSizeTime: { value: 0.0 }
		}
	});

	const pointsMesh = new Points(geometry, material);

	// ── Icon drawing functions ──

	/** GitHub mark — official octocat SVG path rendered on canvas. */
	function drawGithub(c: CanvasRenderingContext2D, s: number) {
		const path = new Path2D(
			'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 ' +
				'0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13' +
				'-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66' +
				'.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15' +
				'-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 ' +
				'1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 ' +
				'1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 ' +
				'1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z'
		);
		const scale = s / 16;
		c.save();
		c.scale(scale, scale);
		c.fillStyle = '#fff';
		c.fill(path);
		c.restore();
	}

	/** Email envelope icon drawn with canvas paths. */
	function drawEmail(c: CanvasRenderingContext2D, s: number) {
		const scale = s / 16;
		c.save();
		c.scale(scale, scale);
		c.fillStyle = '#fff';
		c.strokeStyle = '#fff';
		c.lineWidth = 1.4;
		c.lineJoin = 'round';

		// Envelope body
		c.fillRect(1, 4, 14, 9);

		// Cut V-flap with background color to show fold detail
		c.fillStyle = '#000';
		c.beginPath();
		c.moveTo(1.8, 4);
		c.lineTo(8, 8.8);
		c.lineTo(14.2, 4);
		c.lineTo(8, 7.2);
		c.closePath();
		c.fill();

		c.restore();
	}

	/** LinkedIn mark — Bootstrap Icons / Simple Icons LinkedIn glyph. */
	function drawLinkedin(c: CanvasRenderingContext2D, s: number) {
		const path = new Path2D(
			'M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 ' +
				'.633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 ' +
				'12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 ' +
				'1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 ' +
				'0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586' +
				'.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25' +
				'c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 ' +
				'5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z'
		);
		const scale = s / 16;
		c.save();
		c.scale(scale, scale);
		c.fillStyle = '#fff';
		c.fill(path);
		c.restore();
	}

	/** Resume / document icon — outlined sheet with text lines. */
	function drawResume(c: CanvasRenderingContext2D, s: number) {
		const scale = s / 16;
		c.save();
		c.scale(scale, scale);
		c.fillStyle = '#fff';
		c.strokeStyle = '#fff';
		c.lineWidth = 1.4;
		c.lineJoin = 'round';
		c.lineCap = 'round';

		// Document outline
		c.strokeRect(3, 1.5, 10, 13);

		// Text lines
		c.beginPath();
		c.moveTo(5.2, 5);
		c.lineTo(10.8, 5);
		c.moveTo(5.2, 8);
		c.lineTo(10.8, 8);
		c.moveTo(5.2, 11);
		c.lineTo(8.8, 11);
		c.stroke();

		c.restore();
	}

	/** Rasterize a drawn icon into point positions. */
	function rasterizeIcon(
		drawFn: (c: CanvasRenderingContext2D, size: number) => void,
		iconSize: number
	): { x: number; y: number }[] {
		const canvas = document.createElement('canvas');
		canvas.width = iconSize;
		canvas.height = iconSize;
		const c = canvas.getContext('2d')!;
		c.fillStyle = '#000';
		c.fillRect(0, 0, iconSize, iconSize);
		drawFn(c, iconSize);

		const { data } = c.getImageData(0, 0, iconSize, iconSize);
		const points: { x: number; y: number }[] = [];
		for (let y = 0; y < iconSize; y++) {
			for (let x = 0; x < iconSize; x++) {
				const idx = (y * iconSize + x) * 4;
				if (data[idx] > 128) {
					points.push({ x: x - iconSize / 2, y: y - iconSize / 2 });
				}
			}
		}
		return points;
	}

	// Order matches the DOM nav anchors in +layout.svelte (top → bottom).
	const iconDrawFns = [drawResume, drawGithub, drawLinkedin, drawEmail];

	// ── Build particles on resize ──
	$effect(() => {
		const H = $size.height;
		if (H <= 0) return;

		const centerY = H / 2;
		let idx = 0;

		for (let li = 0; li < iconDrawFns.length; li++) {
			const ey = centerY + (li - (iconDrawFns.length - 1) / 2) * SPACING;
			const cx = SIDEBAR_X + ICON_SIZE / 2;
			const pixels = rasterizeIcon(iconDrawFns[li], ICON_SIZE);

			for (const p of pixels) {
				if (idx >= MAX_PARTICLES) break;
				positions[idx * 3] = cx + p.x;
				positions[idx * 3 + 1] = ey + p.y;
				positions[idx * 3 + 2] = 0;
				colors[idx * 3] = BLUE_R;
				colors[idx * 3 + 1] = BLUE_G;
				colors[idx * 3 + 2] = BLUE_B;
				alphas[idx] = 0.9;
				pointSizes[idx] = 0.3 + Math.random() * 0.4;
				sizePhases[idx] = Math.random() * 6.283;
				idx++;
			}
		}

		geometry.setDrawRange(0, idx);
		posAttr.needsUpdate = true;
		colorAttr.needsUpdate = true;
		alphaAttr.needsUpdate = true;
		sizeAttr.needsUpdate = true;
		phaseAttr.needsUpdate = true;
	});

	// ── Animation: gentle twinkle ──
	useTask(() => {
		material.uniforms.uSizeTime.value = performance.now() * 0.0008;
	});

	$effect(() => {
		return () => {
			geometry.dispose();
			material.dispose();
		};
	});
</script>

<T is={pointsMesh} />
