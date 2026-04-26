<script lang="ts">
	import Portfolio from '$lib/components/Portfolio.svelte';
</script>

<svelte:head>
	<title>Casey</title>
</svelte:head>

<div class="hero-spacer"></div>

<Portfolio />

<style>
	.hero-spacer {
		height: 100vh;
		pointer-events: none;
	}
</style>
