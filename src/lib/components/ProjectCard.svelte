<script lang="ts">
	import type { Project } from '$lib/data/projects';
	import { getParticleContext } from '$lib/particle/context.svelte';

	let { project, reversed = false }: { project: Project; reversed?: boolean } = $props();

	const ctx = getParticleContext();
	let imageEl: HTMLAnchorElement;

	// Particle cloud follows the image rect (with a slight bias toward the text
	// side, encoded in data-particle-bias-x). Hover area stays the whole card.
	const onenter = () => ctx.setHovered(imageEl);
	const onleave = () => {
		if (ctx.hoveredHeader === imageEl) ctx.setHovered(null);
	};
</script>

<div
	class="card"
	class:reversed
	onmouseenter={onenter}
	onmouseleave={onleave}
	role="group"
>
	<a
		href={project.href}
		target="_blank"
		rel="noopener noreferrer"
		class="image-link"
		bind:this={imageEl}
		data-particle-header={project.title}
	>
		<img src={project.image} alt={project.title} loading="lazy" />
	</a>

	<div class="content">
		<h3>
			<a href={project.href} target="_blank" rel="noopener noreferrer">{project.title}</a>
		</h3>
		<p>{project.description}</p>
		<div class="tags">
			{#each project.tags as tag (tag)}
				<span class="tag">{tag}</span>
			{/each}
		</div>
	</div>
</div>

<style>
	.card {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2.5rem;
		align-items: center;
		padding: 2rem 0;
	}

	.card.reversed {
		direction: rtl;
	}

	.card.reversed > * {
		direction: ltr;
	}

	.image-link {
		display: block;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
		transition:
			transform 0.25s ease,
			box-shadow 0.25s ease;
	}

	.image-link:hover {
		transform: translateY(-3px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
	}

	img {
		width: 100%;
		height: auto;
		aspect-ratio: 16 / 9;
		object-fit: cover;
		display: block;
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	h3 {
		font-size: 1.2rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		margin: 0;
	}

	h3 a {
		color: #1a1a1a;
		text-decoration: none;
		transition: color 0.15s;
	}

	h3 a:hover {
		color: #2b5c8a;
	}

	p {
		font-size: 0.92rem;
		font-weight: 400;
		line-height: 1.65;
		color: #3a3a3a;
		margin: 0;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.3rem;
	}

	.tag {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.2em 0.6em;
		background: #e8e2d8;
		color: #5a5245;
		border-radius: 4px;
		letter-spacing: 0.01em;
	}

	@media (max-width: 768px) {
		.card {
			grid-template-columns: 1fr;
			gap: 1.2rem;
		}

		.card.reversed {
			direction: ltr;
		}
	}
</style>
