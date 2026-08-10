import { getCollection, type CollectionEntry } from "astro:content";
import { areas, type Area } from "../i18n/areas";
import type { Locale } from "../i18n/ui";

export type Post = CollectionEntry<Area>;

// The only place literal collection names appear outside content.config.ts.
const loaders: Record<Area, () => Promise<Post[]>> = {
  dev: () => getCollection("dev"),
  hobbies: () => getCollection("hobbies"),
};

/** Glob base is the area dir, so `entry.id` is `<locale>/<slug>`. */
export function slugOf(post: Post, locale: Locale): string {
  return post.id.slice(locale.length + 1);
}

export async function getAreaPosts(area: Area, locale: Locale): Promise<Post[]> {
  const entries = await loaders[area]();
  return entries
    .filter((entry) => entry.id.startsWith(`${locale}/`))
    .filter((entry) => !entry.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export async function getAllPosts(locale: Locale): Promise<Post[]> {
  const groups = await Promise.all(areas.map((area) => getAreaPosts(area, locale)));
  return groups.flat().sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}
