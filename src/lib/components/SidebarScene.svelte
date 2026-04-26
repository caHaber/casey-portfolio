<script lang="ts">
	import { T, useThrelte } from '@threlte/core';
	import { OrthographicCamera } from 'three';
	import SidebarParticles from './SidebarParticles.svelte';

	const { size, renderer } = useThrelte();

	// Transparent clear so this canvas overlays the main scrolling canvas.
	$effect(() => {
		renderer.setClearColor(0x000000, 0);
	});
</script>

<T
	is={OrthographicCamera}
	makeDefault
	args={[0, $size.width, 0, $size.height, 0.1, 10]}
	position={[$size.width / 2, $size.height / 2, 1]}
/>

<SidebarParticles />
