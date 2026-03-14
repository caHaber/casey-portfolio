// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	declare module '*.svx' {
		import type { SvelteComponent } from 'svelte';

		export default class Comp extends SvelteComponent {}

		export const metadata: Record<string, unknown>;
	}
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
