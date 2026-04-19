<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Canvas } from '@threlte/core';
	import Scene from '$lib/components/Scene.svelte';
	import ParticleRefreshButton from '$lib/components/ParticleRefreshButton.svelte';
	import { createParticleContext } from '$lib/particle/context.svelte';

	let { children } = $props();

	// Provide particle context to all descendants — both Canvas children (ParticleSystem,
	// MarkdownPixelDisplay) and DOM siblings (ParticleRefreshButton).
	createParticleContext();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="canvas-root">
	<Canvas renderMode="always" dpr={typeof window !== 'undefined' ? window.devicePixelRatio : 1}>
		<Scene />
	</Canvas>
	<ParticleRefreshButton />
</div>

{@render children()}

<style>
	.canvas-root {
		position: fixed;
		inset: 0;
	}
</style>
