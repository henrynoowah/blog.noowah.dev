// @ts-check
import { defineConfig } from 'astro/config';

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

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel()
});
