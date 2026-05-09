import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

const config = {
  extensions: ['.svelte', '.md'],
  preprocess: [vitePreprocess(), mdsvex({ extensions: ['.md'] })],
  kit: {
    adapter: adapter({ pages: 'build', assets: 'build', fallback: '404.html' }),
    paths: {
      // ⚠️ Change to YOUR GitHub repo name
      base: process.env.NODE_ENV === 'production' ? '/transformer-encyclopedia' : ''
    }
  }
};
export default config;