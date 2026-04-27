<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Canvas } from '@threlte/core';
	import Scene from '$lib/components/Scene.svelte';
	import SidebarScene from '$lib/components/SidebarScene.svelte';
	import ResumeOverlay from '$lib/components/ResumeOverlay.svelte';
	import { createParticleContext } from '$lib/particle/context.svelte';

	let { children } = $props();
	let canvasRoot: HTMLDivElement;
	let resumeOpen = $state(false);

	createParticleContext();

	// Lusion WebGL-Scroll-Sync technique: canvas is `position: absolute`, so it
	// rides the document via native compositor scroll between rAF frames. Each
	// rAF we re-apply translateY(scrollY) so the canvas covers the current
	// viewport. DOM and canvas can never desync — they scroll together natively.
	$effect(() => {
		if (!canvasRoot) return;
		let rafId = 0;
		const tick = () => {
			canvasRoot.style.transform = `translate3d(0, ${window.scrollY}px, 0)`;
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="page-wrapper">
	<div class="canvas-root" bind:this={canvasRoot}>
		<Canvas renderMode="always" dpr={typeof window !== 'undefined' ? window.devicePixelRatio : 1}>
			<Scene />
		</Canvas>
	</div>

	{@render children()}
</div>

<!-- Separate fixed canvas: sidebar particles live in viewport space, never
     ride the scrolling canvas, so they can never sub-frame jitter. -->
<div class="sidebar-canvas">
	<Canvas renderMode="always" dpr={typeof window !== 'undefined' ? window.devicePixelRatio : 1}>
		<SidebarScene />
	</Canvas>
</div>

<nav class="sidebar-nav" aria-label="Social links">
	<a
		href="/resume.pdf"
		download="casey-haber-resume.pdf"
		aria-label="Open resume"
		title="View resume"
		onclick={(e) => {
			e.preventDefault();
			resumeOpen = true;
		}}
	></a>
	<a
		href="https://github.com/cahaber"
		target="_blank"
		rel="noopener noreferrer"
		aria-label="GitHub"
		title="GitHub"
	></a>
	<a
		href="https://linkedin.com/in/cahaber"
		target="_blank"
		rel="noopener noreferrer"
		aria-label="LinkedIn"
		title="LinkedIn"
	></a>
	<a href="mailto:haber.casey@gmail.com" aria-label="Email" title="Email Casey"></a>
</nav>

{#if resumeOpen}
	<ResumeOverlay onclose={() => (resumeOpen = false)} />
{/if}

<style>
	/* Wrapper with overflow:hidden so the absolute canvas's transform doesn't
	   extend the document's scroll height. Scroll bounds = wrapper content height. */
	.page-wrapper {
		position: relative;
		overflow: hidden;
		min-height: 100vh;
	}

	.canvas-root {
		position: absolute;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 0;
		pointer-events: none;
		will-change: transform;
	}

	.sidebar-canvas {
		position: fixed;
		inset: 0;
		z-index: 1;
		pointer-events: none;
	}

	/* Invisible click targets sized & positioned to match the WebGL sidebar icons
	   (SIDEBAR_X=32, ICON_SIZE=36, SPACING=56 in SidebarParticles.svelte). */
	.sidebar-nav {
		position: fixed;
		left: 32px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		gap: 20px;
		z-index: 5;
	}

	.sidebar-nav a {
		display: block;
		width: 36px;
		height: 36px;
		cursor: pointer;
	}
</style>
