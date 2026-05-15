import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	compilerOptions: {
		// Force runes mode except node_modules
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes('node_modules')
				? undefined
				: true
	},

	resolve: {
		preserveSymlinks: true
	},

	kit: {
		csrf: {
			checkOrigin: false
		},
		adapter: adapter({
			out: 'build',
			precompress: false,
			envPrefix: ''
		}),

		typescript: {
			config: (config) => ({
				...config,
				include: [...config.include, '../drizzle.config.ts']
			})
		}
	}
};

export default config;