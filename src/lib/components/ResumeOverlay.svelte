<script lang="ts">
	import Resume from '$lib/docs/resume.md';

	let { onclose }: { onclose: () => void } = $props();

	// Resume styles, injected at runtime so they apply globally (Svelte's
	// scope-hashing would otherwise miss the markdown-rendered nodes).
	const RESUME_CSS = `
		.resume-doc {
			max-width: 820px;
			margin: 0 auto;
			padding: 56px 64px 96px;
			background: #fdfaf3;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
			border: 1px solid #e8e2d8;
			border-radius: 4px;
			color: #1a1a1a;
			font-family: 'Parclo Serif', Georgia, 'Times New Roman', serif;
			line-height: 1.6;
		}
		.resume-doc > :first-child { margin-top: 0; }
		.resume-doc h1 {
			font-size: 2.4rem;
			font-weight: 800;
			letter-spacing: -0.02em;
			margin: 0 0 0.15em;
			line-height: 1.1;
		}
		.resume-doc h1 + p strong { font-weight: 600; color: #2b5c8a; }
		.resume-doc h2 {
			font-size: 0.95rem;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.08em;
			color: #5a5245;
			margin: 2.4em 0 0.6em;
			padding-bottom: 0.3em;
			border-bottom: 1px solid #d5cfc4;
		}
		.resume-doc h3 {
			font-size: 1.05rem;
			font-weight: 700;
			margin: 1.6em 0 0.3em;
		}
		.resume-doc p { margin: 0.5em 0; }
		.resume-doc h3 + p em {
			color: #5a5245;
			font-style: italic;
			font-size: 0.92em;
		}
		.resume-doc strong { font-weight: 700; }
		.resume-doc a {
			color: #2b5c8a;
			text-decoration: underline;
			text-underline-offset: 2px;
			text-decoration-thickness: 1px;
		}
		.resume-doc a:hover { color: #1a3d5c; }
		.resume-doc hr {
			border: none;
			border-top: 1px solid #e8e2d8;
			margin: 2em 0;
		}
		.resume-doc ul { padding-left: 1.4em; margin: 0.7em 0; }
		.resume-doc li { margin: 0.45em 0; line-height: 1.55; }
		.resume-doc table {
			border-collapse: collapse;
			margin: 0.6em 0 1em;
			width: 100%;
		}
		.resume-doc thead { display: none; }
		.resume-doc td {
			padding: 0.35em 0.8em 0.35em 0;
			vertical-align: top;
			border: none;
		}
		.resume-doc tbody tr td:first-child {
			font-weight: 600;
			white-space: nowrap;
			color: #5a5245;
			width: 1%;
			padding-right: 1.5em;
		}
	`;

	$effect(() => {
		const tag = document.createElement('style');
		tag.textContent = RESUME_CSS;
		document.head.appendChild(tag);
		return () => tag.remove();
	});

	function onkey(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={onkey} />

<div class="overlay" role="dialog" aria-modal="true" aria-label="Resume">
	<header class="bar">
		<a class="action download" href="/resume.pdf" download="casey-haber-resume.pdf">
			Download PDF
		</a>
		<button class="action close" type="button" onclick={onclose} aria-label="Close">×</button>
	</header>
	<div class="scroll">
		<article class="resume-doc">
			<Resume />
		</article>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: #f5f0e8;
		z-index: 1000;
		display: flex;
		flex-direction: column;
	}
	.bar {
		flex: 0 0 auto;
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 12px;
		padding: 16px 24px;
		background: rgba(245, 240, 232, 0.96);
		backdrop-filter: blur(6px);
		border-bottom: 1px solid #e2dccf;
		position: sticky;
		top: 0;
		z-index: 1;
	}
	.action {
		font-family: inherit;
		cursor: pointer;
		border: none;
		display: inline-block;
		text-decoration: none;
	}
	.download {
		background: #2b5c8a;
		color: #fff;
		padding: 10px 18px;
		font-size: 0.92rem;
		font-weight: 600;
		border-radius: 4px;
		letter-spacing: 0.01em;
		transition: background 0.15s;
	}
	.download:hover { background: #1a3d5c; }
	.close {
		background: transparent;
		color: #1a1a1a;
		font-size: 1.6rem;
		line-height: 1;
		padding: 4px 12px;
		transition: color 0.15s;
	}
	.close:hover { color: #2b5c8a; }
	.scroll {
		flex: 1 1 auto;
		overflow: auto;
		padding: 32px 16px 80px;
	}
</style>
