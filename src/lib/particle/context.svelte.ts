import { getContext, setContext } from 'svelte';

const CONTEXT_KEY = Symbol('particleContext');

export interface ParticleContext {
	/** Currently selected nav index (null = hero/home state). Reactive — read in $derived/$effect. */
	readonly selectedIndex: number | null;
	/** Increments each time reset() is called. React to this in $effect to trigger reset logic. */
	readonly resetCount: number;
	/** Select a nav item by index, or pass null to return to hero state. */
	selectNav(index: number | null): void;
	/** Request particles to reset to their initial scatter positions. */
	reset(): void;
}

/**
 * Create the particle context and register it with Svelte's context system.
 * Must be called at the top level of a component's <script> block (not inside an effect).
 * Call this in the highest component that needs to share state (e.g. +layout.svelte).
 */
export function createParticleContext(): ParticleContext {
	let selectedIndex = $state<number | null>(null);
	let resetCount = $state(0);

	const ctx: ParticleContext = {
		get selectedIndex() {
			return selectedIndex;
		},
		get resetCount() {
			return resetCount;
		},
		selectNav(index) {
			selectedIndex = index;
		},
		reset() {
			resetCount++;
		}
	};

	setContext(CONTEXT_KEY, ctx);
	return ctx;
}

/**
 * Retrieve the particle context in any descendant component.
 * Must be called at the top level of a component's <script> block.
 */
export function getParticleContext(): ParticleContext {
	return getContext<ParticleContext>(CONTEXT_KEY);
}
