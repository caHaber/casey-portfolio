import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: { adapter: adapter() },
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) => {
			if (filename.includes('node_modules')) return undefined;
			if (filename.endsWith('.md') || filename.endsWith('.svx')) return { runes: false };
			return { runes: true };
		}
	},
	preprocess: [mdsvex({extensions: ['.md']})],
	extensions: ['.svelte', '.svx', '.md']
};

export default config;
