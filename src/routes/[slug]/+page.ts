import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

const modules = import.meta.glob('/src/content/*.md');

export const load: PageLoad = async ({ params }) => {
  // Prevent browser asset requests (like favicon.ico) from crashing the router
  if (params.slug.includes('.')) {
    throw error(404, 'Not found');
  }

  const path = `/src/content/${params.slug}.md`;
  if (!modules[path]) {
    throw error(404, `No content found for: ${params.slug}`);
  }
  
  const mod = await modules[path]() as { default: unknown; metadata?: Record<string,string> };
  return { slug: params.slug, content: mod.default, metadata: mod.metadata ?? {} };
};