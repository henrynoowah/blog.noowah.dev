import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { areas } from "../../i18n/areas";
import { postHref } from "../../i18n/areas";
import { languages, t, type Locale } from "../../i18n/ui";
import { getAreaPosts, slugOf } from "../../lib/posts";

export function getStaticPaths() {
  return Object.keys(languages).map((locale) => ({ params: { locale } }));
}

export const GET: APIRoute = async (context) => {
  const locale = context.params.locale as Locale;

  // getAllPosts drops the area, but we need it for the link — enumerate per-area.
  const withArea = (await Promise.all(
    areas.map((area) => getAreaPosts(area, locale).then((posts) => posts.map((post) => ({ post, area })))),
  )).flat();
  withArea.sort((a, b) => b.post.data.pubDate.valueOf() - a.post.data.pubDate.valueOf());

  return rss({
    title: t(locale, "site.title"),
    description: t(locale, "site.tagline"),
    site: context.site!,
    items: withArea.map(({ post, area }) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: postHref(locale, area, slugOf(post, locale)),
    })),
  });
};
