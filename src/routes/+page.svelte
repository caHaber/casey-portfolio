<script lang="ts">
	import { navState } from '$lib/stores/nav.svelte';
	import Projects from '$lib/docs/projects.svx';
	import Writing from '$lib/docs/writing.svx';
	import About from '$lib/docs/about.svx';

	const navContent = [
		{ label: 'Projects', component: Projects },
		{ label: 'Writing', component: Writing },
		{ label: 'About', component: About }
	];
</script>

<svelte:head>
	<title>Casey</title>
</svelte:head>
<!-- <About/> -->
{#if navState.selectedIndex !== null}
	{#key navState.selectedIndex}
		{#if navContent[navState.selectedIndex]}
			{@const item = navContent[navState.selectedIndex]}
			{@const Component = item.component}
			<div class="content-overlay">
				<div class="content-body">
					<Component />
				</div>
			</div>
		{/if}
	{/key}
{/if}

<style>
	.content-overlay {
		position: fixed;
		top: 58%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(560px, 80vw);
		/* text-align: center; */
		pointer-events: none;
		animation: fade-up 0.5s ease forwards;
	}

	@keyframes fade-up {
		from {
			opacity: 0;
			transform: translate(-50%, calc(-50% + 12px));
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%);
		}
	}

	.content-body {
		color: rgba(255, 255, 255, 0.55);
		font-size: 0.9rem;
		line-height: 1.85;
		letter-spacing: 0.02em;
		margin: 0;
	}

	.content-body :global(h1),
	.content-body :global(h2),
	.content-body :global(h3),
	.content-body :global(h4),
	.content-body :global(h5),
	.content-body :global(h6) {
		color: rgba(255, 255, 255, 0.85);
		font-weight: 600;
		letter-spacing: 0.02em;
		margin: 0 0 0.75rem;
		line-height: 1.3;
	}

	.content-body :global(h1) { font-size: 1.5rem; }
	.content-body :global(h2) { font-size: 1.3rem; }
	.content-body :global(h3) { font-size: 1.1rem; }
	.content-body :global(h4),
	.content-body :global(h5),
	.content-body :global(h6) { font-size: 1rem; }

	.content-body :global(p) {
		margin: 0 0 0.75rem;
	}

	.content-body :global(p:last-child) {
		margin-bottom: 0;
	}
</style>
