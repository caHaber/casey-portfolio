<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Canvas } from '@threlte/core';
	import Scene from '$lib/components/Scene.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="canvas-root">
	<Canvas renderMode="always" dpr={typeof window !== 'undefined' ? window.devicePixelRatio : 1}>
		<Scene />
	</Canvas>
</div>

{@render children()}

<style>
	.canvas-root {
		position: fixed;
		inset: 0;
	}
</style>
