<script lang="ts">
	import { T, useThrelte } from '@threlte/core';
	import { OrthographicCamera } from 'three';
	import ParticleSystem from './ParticleSystem.svelte';

	const { size, renderer } = useThrelte();

	$effect(() => {
		renderer.setClearColor(0xf5f0e8, 1);
	});
</script>

<!-- Orthographic camera in pixel space: (0,0) top-left, (W,H) bottom-right. Order: left, right, top, bottom, near, far -->
<T
	is={OrthographicCamera}
	makeDefault
	args={[0, $size.width, 0, $size.height, 0.1, 10]}
	position={[$size.width/2, $size.height/2, 1]}
/>

<ParticleSystem />
