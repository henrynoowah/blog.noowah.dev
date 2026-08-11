import type { APIRoute } from "astro";
import { areaLabel, areas, postHref } from "../i18n/areas";
import { defaultLocale, t } from "../i18n/ui";
import { getAreaPosts, slugOf } from "../lib/posts";

// llms.txt convention: https://llmstxt.org/ — a single-language (default: en) map of the site.
export const GET: APIRoute = async ({ site }) => {
  const locale = defaultLocale;
  const abs = (path: string) => new URL(path, site).href;

  const sections = (await Promise.all(
    areas.map(async (area) => {
      const posts = await getAreaPosts(area, locale);
      if (posts.length === 0) return null; // skip areas with no published posts
      const links = posts.map(
        (post) => `- [${post.data.title}](${abs(postHref(locale, area, slugOf(post, locale)))}): ${post.data.description}`,
      );
      return `## ${areaLabel(locale, area)}\n\n${links.join("\n")}`;
    }),
  )).filter(Boolean);

  const body = [`# ${t(locale, "site.title")}`, `> ${t(locale, "site.tagline")}`, ...sections].join("\n\n") + "\n";

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
