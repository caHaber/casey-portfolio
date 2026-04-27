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
	>
		<svg viewBox="0 0 16 16" aria-hidden="true">
			<rect
				x="3"
				y="1.5"
				width="10"
				height="13"
				rx="0.5"
				fill="none"
				stroke="currentColor"
				stroke-width="1.4"
			/>
			<path
				d="M5.2 5h5.6 M5.2 8h5.6 M5.2 11h3.6"
				fill="none"
				stroke="currentColor"
				stroke-width="1.4"
				stroke-linecap="round"
			/>
		</svg>
	</a>
	<a
		href="https://github.com/cahaber"
		target="_blank"
		rel="noopener noreferrer"
		aria-label="GitHub"
		title="GitHub"
	>
		<svg viewBox="0 0 16 16" aria-hidden="true">
			<path
				d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
				fill="currentColor"
			/>
		</svg>
	</a>
	<a
		href="https://www.linkedin.com/in/casey-haber-143716b2"
		target="_blank"
		rel="noopener noreferrer"
		aria-label="LinkedIn"
		title="LinkedIn"
	>
		<svg viewBox="0 0 16 16" aria-hidden="true">
			<path
				d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"
				fill="currentColor"
			/>
		</svg>
	</a>
	<a href="mailto:haber.casey@gmail.com" aria-label="Email" title="Email Casey">
		<svg viewBox="0 0 16 16" aria-hidden="true">
			<rect
				x="1"
				y="3"
				width="14"
				height="10"
				rx="1.2"
				fill="none"
				stroke="currentColor"
				stroke-width="1.4"
			/>
			<path
				d="M2 4l6 4.5L14 4"
				fill="none"
				stroke="currentColor"
				stroke-width="1.4"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</a>
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

	/* Desktop: invisible click targets sized & positioned to match the WebGL
	   sidebar icons (SIDEBAR_X=32, ICON_SIZE=36, SPACING=56 in
	   SidebarParticles.svelte). The inline SVGs inside each <a> stay hidden so
	   the WebGL particles drive the visual. */
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

	.sidebar-nav svg {
		display: none;
	}

	/* Mobile: keep the main hero canvas (so the pixels still form the hero
	   text), but drop the sidebar-canvas and turn the nav into a bottom dock
	   with visible SVG icons. The fixed-left-32 desktop dock would overlap
	   the narrow portfolio column. */
	@media (max-width: 767px) {
		.sidebar-canvas {
			display: none;
		}

		.sidebar-nav {
			top: auto;
			left: 0;
			right: 0;
			bottom: 0;
			transform: none;
			flex-direction: row;
			justify-content: center;
			gap: 28px;
			padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0));
			background: rgba(245, 240, 232, 0.96);
			backdrop-filter: blur(10px);
			-webkit-backdrop-filter: blur(10px);
			border-top: 1px solid #e2dccf;
		}

		.sidebar-nav a {
			width: 44px;
			height: 44px;
			display: flex;
			align-items: center;
			justify-content: center;
			color: #2b5c8a;
			transition: opacity 0.15s;
		}

		.sidebar-nav a:hover,
		.sidebar-nav a:active {
			opacity: 0.7;
		}

		.sidebar-nav svg {
			display: block;
			width: 26px;
			height: 26px;
		}
	}
</style>
