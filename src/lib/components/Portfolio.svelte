<script lang="ts">
	import { experience, research } from '$lib/data/projects';
	import ProjectCard from './ProjectCard.svelte';
</script>

<section class="portfolio">
	{#each experience as section, sectionIdx (section.company)}
		<div class="experience-section">
			<h2>{section.company}</h2>
			<p class="role">
				{section.role} · <em>{section.period}</em>
			</p>

			{#each section.projects as project, projectIdx (project.title)}
				<ProjectCard {project} reversed={(sectionIdx + projectIdx) % 2 === 1} />
			{/each}
		</div>

		{#if sectionIdx < experience.length - 1}
			<hr />
		{/if}
	{/each}

	<hr />

	<h2>Research & Publications</h2>
	<ul class="research-list">
		{#each research as item (item.title)}
			<li>
				<a href={item.href} target="_blank" rel="noopener noreferrer">{item.title}</a>
				<span class="research-desc">{item.description}</span>
			</li>
		{/each}
	</ul>

	<hr />

	<h2>Education</h2>
	<h3>B.S. Computer Science, Minor in Design · University of San Francisco</h3>
	<ul class="edu-list">
		<li>Teaching Assistant — Data Visualization (CS360), Assembly & CPU Design (CS315).</li>
		<li>
			Research Assistant — Data visualization research (multi-class scatterplot defaults, published
			at ACM BELIV) and African American Studies research.
		</li>
	</ul>
</section>

<style>
	.portfolio {
		position: relative;
		z-index: 2;
		max-width: 960px;
		margin: 0 auto;
		padding: 80px 32px 120px;
		font-family: 'Parclo Serif', serif;
		color: #1a1a1a;
		line-height: 1.7;
		/* Soft halo around glyphs so particles can still show between text
		   without fighting the type for legibility. Inherited by descendants. */
		text-shadow:
			0 0 6px rgba(245, 240, 232, 0.95),
			0 0 12px rgba(245, 240, 232, 0.7);
	}

	.portfolio::before {
		content: '';
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100vw;
		height: 100%;
		background: transparent;
		z-index: -1;
	}

	h2 {
		font-size: 1.4rem;
		font-weight: 700;
		margin-top: 2.5em;
		margin-bottom: 0.6em;
		letter-spacing: -0.01em;
	}

	h3 {
		font-size: 1.05rem;
		font-weight: 600;
		margin-top: 1.8em;
		margin-bottom: 0.3em;
	}

	hr {
		border: none;
		border-top: 1px solid #d5cfc4;
		margin: 2em 0;
	}

	.role {
		font-size: 0.95rem;
		font-weight: 400;
		color: #4a4a4a;
		margin-bottom: 0.5em;
	}

	.role em {
		font-style: italic;
	}

	.experience-section h2 {
		margin-top: 1em;
	}

	.research-list {
		list-style: none;
		padding: 0;
	}

	.research-list li {
		position: relative;
		padding-left: 1.2em;
		margin-bottom: 1em;
		font-size: 0.95rem;
	}

	.research-list li::before {
		content: '—';
		position: absolute;
		left: 0;
		color: #9a9080;
	}

	.research-list a {
		color: #2b5c8a;
		text-decoration: underline;
		text-underline-offset: 2px;
		text-decoration-thickness: 1px;
		font-weight: 600;
		transition: color 0.15s;
	}

	.research-list a:hover {
		color: #1a3d5c;
	}

	.research-desc {
		display: block;
		color: #4a4a4a;
		font-size: 0.9rem;
		margin-top: 0.2em;
	}

	.edu-list {
		list-style: none;
		padding: 0;
	}

	.edu-list li {
		position: relative;
		padding-left: 1.2em;
		margin-bottom: 0.7em;
		font-size: 0.95rem;
		font-weight: 400;
	}

	.edu-list li::before {
		content: '—';
		position: absolute;
		left: 0;
		color: #9a9080;
	}

	@media (max-width: 768px) {
		.portfolio {
			padding: 48px 20px 80px;
		}
	}
</style>
