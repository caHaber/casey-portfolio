<script lang="ts">
	import SquareGrid from '$lib/components/SquareGrid.svelte';
	import FloatingNav from '$lib/components/FloatingNav.svelte';

	const navLinks = [
		{ label: 'Projects', href: '/projects' },
		{ label: 'Writing', href: '/writing' },
		{ label: 'About', href: '/about' }
	];
</script>

<svelte:head>
	<title>Casey</title>
</svelte:head>

<SquareGrid />

<div class="overlay">
	<FloatingNav links={navLinks} />
	<p class="bio">Software engineer, designer, and builder of things.</p>
</div>

<style>
	.overlay {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 3rem 2rem;
		animation: fade-in 0.6s ease forwards;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.bio {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.95rem;
		letter-spacing: 0.04em;
		text-align: center;
		max-width: 40ch;
		line-height: 1.7;
	}
</style>
