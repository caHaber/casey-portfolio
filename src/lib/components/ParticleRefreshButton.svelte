<script lang="ts">
	import { getParticleContext } from '$lib/particle/context.svelte';

	const ctx = getParticleContext();
</script>

<button
	type="button"
	class="refresh"
	aria-label="Reset particles"
	onclick={() => ctx.reset()}
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
		<path d="M3 3v5h5" />
	</svg>
</button>

<style>
	.refresh {
		position: fixed;
		top: 12px;
		left: 12px;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.6);
		cursor: pointer;
		transition: background 0.2s, color 0.2s, transform 0.2s;
	}
	.refresh:hover {
		background: rgba(255, 255, 255, 0.14);
		color: rgba(255, 255, 255, 0.9);
	}
	.refresh:active {
		transform: scale(0.96);
	}
	.refresh:focus-visible {
		outline: 2px solid rgba(255, 255, 255, 0.5);
		outline-offset: 2px;
	}
</style>
