<script lang="ts">
	import { resolve } from '$app/paths';

	interface NavLink {
		label: string;
		href: string;
	}

	let { links }: { links: NavLink[] } = $props();
</script>

<nav>
	{#each links as link, i (link.href)}
		<a href={resolve(link.href as any)} style="--delay: {i * 0.5}s">
			{link.label}
		</a>
	{/each}
</nav>

<style>
	nav {
		display: flex;
		gap: 3rem;
		align-items: center;
	}

	a {
		color: rgba(255, 255, 255, 0.75);
		text-decoration: none;
		font-size: 1.1rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		animation: float 3.5s ease-in-out infinite;
		animation-delay: var(--delay, 0s);
		transition: color 0.2s ease;
	}

	a:hover {
		color: rgba(255, 255, 255, 1);
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-7px);
		}
	}
</style>
