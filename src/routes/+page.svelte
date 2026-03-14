<script lang="ts">
	import { navState } from '$lib/stores/nav.svelte';

	const navContent = [
		{
			label: 'Projects',
			body: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque vehicula sapien nec
			turpis dictum, at facilisis eros tincidunt. Praesent commodo, nisl ac sodales posuere,
			metus neque ornare nisi, nec hendrerit libero felis in ligula. Curabitur euismod metus
			at dui laoreet, vel commodo velit posuere. Sed vel tincidunt orci. Integer pharetra
			scelerisque nulla, et placerat quam condimentum ac.`
		},
		{
			label: 'Writing',
			body: `Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis
			egestas. Nulla facilisi. Donec sollicitudin molestie malesuada. Vivamus magna. Fusce
			risus nisl, viverra et, tempor et, pretium in, sapien. Donec volutpat ligula vel
			sapien posuere faucibus. Cras sagittis ipsum nec lacus semper, non ultricies lectus
			imperdiet. Suspendisse viverra diam nec metus efficitur lacinia.`
		},
		{
			label: 'About',
			body: `Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
			laudantium, totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi
			architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas
			sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione
			voluptatem sequi nesciunt.`
		}
	];
</script>

<svelte:head>
	<title>Casey</title>
</svelte:head>

{#if navState.selectedIndex !== null}
	{#key navState.selectedIndex}
		<div class="content-overlay">
			<p class="content-label">{navContent[navState.selectedIndex].label}</p>
			<p class="content-body">{navContent[navState.selectedIndex].body}</p>
		</div>
	{/key}
{/if}

<style>
	.content-overlay {
		position: fixed;
		top: 58%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(560px, 80vw);
		text-align: center;
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

	.content-label {
		color: rgba(255, 255, 255, 0.35);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		margin: 0 0 1rem;
	}

	.content-body {
		color: rgba(255, 255, 255, 0.55);
		font-size: 0.9rem;
		line-height: 1.85;
		letter-spacing: 0.02em;
		margin: 0;
	}
</style>
