// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

import mermaid from 'astro-mermaid';

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.noowah.dev',

  // Renders ```mermaid code fences as diagrams. autoTheme follows the
  // site's data-theme attribute (see ThemeToggle.astro).
  integrations: [mermaid({ theme: 'default', autoTheme: true })],

  i18n: {
    locales: ['en', 'ko'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true
    }
  },

  redirects: {
    '/': '/en'
  },

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel()
});