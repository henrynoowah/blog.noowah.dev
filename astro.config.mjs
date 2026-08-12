// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

import mermaid from 'astro-mermaid';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.noowah.dev',

  // Renders ```mermaid code fences as diagrams. autoTheme follows the
  // site's data-theme attribute (see ThemeToggle.astro).
  integrations: [
    mermaid({ theme: 'default', autoTheme: true }),
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', ko: 'ko' } },
      // Drop the bare "/" alias — it duplicates "/en/" (see src/pages/index.astro).
      filter: (page) => page !== 'https://blog.noowah.dev/',
    }),
  ],

  i18n: {
    locales: ['en', 'ko'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true
    }
  },

  // Self-hosted at build time — no fonts.googleapis.com request. Astro emits
  // only the @font-face rules for these weights/subsets, minified, same-origin.
  fonts: [
    {
      name: "Jost", cssVariable: "--font-jost", provider: fontProviders.google(),
      weights: [400, 500, 700, 900], styles: ["normal", "italic"],
      subsets: ["latin"], fallbacks: [],
    },
    {
      name: "Gothic A1", cssVariable: "--font-gothic-a1", provider: fontProviders.google(),
      weights: [500, 700, 800], styles: ["normal"],
      subsets: ["latin", "korean"], fallbacks: ["sans-serif"],
    },
    {
      name: "Noto Sans KR", cssVariable: "--font-noto-kr", provider: fontProviders.google(),
      weights: [400, 500, 700], styles: ["normal"],
      subsets: ["latin", "korean"], fallbacks: ["sans-serif"],
    },
    {
      name: "IBM Plex Mono", cssVariable: "--font-ibm-mono", provider: fontProviders.google(),
      weights: [400, 500], styles: ["normal"],
      subsets: ["latin"], fallbacks: ["monospace"],
    },
  ],

  // 'auto' only inlines <4KB, so the ~6.5KB Tailwind bundle stays a
  // render-blocking <link>. 'always' inlines it into <head>.
  build: { inlineStylesheets: 'always' },

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel()
});
