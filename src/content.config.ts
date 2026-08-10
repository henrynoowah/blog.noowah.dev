import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import type { Area } from './i18n/areas';

// Single source of truth for post frontmatter — both areas share it.
const postSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false)
});

const postsIn = (area: Area) =>
  defineCollection({
    loader: glob({ pattern: '**/*.md', base: `./src/content/${area}` }),
    schema: postSchema
  });

// Keys must stay literal — Astro derives DataEntryMap from this module's type.
// `satisfies` makes areas.ts and this map drift into a compile error.
export const collections = {
  dev: postsIn('dev'),
  hobbies: postsIn('hobbies')
} satisfies Record<Area, ReturnType<typeof postsIn>>;
