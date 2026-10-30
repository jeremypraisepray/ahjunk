// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ahernandezjunkremoval.com',
  output: 'static', // pages prerendered; /api/quote opts out (prerender = false)
  adapter: vercel(),
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !/\/(thank-you|404)\/?$/.test(page) })],
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false }, // no render-blocking CSS requests
  // Old WordPress URLs → new pages. TODO(owner): add any other indexed WP paths.
  redirects: {
    '/home-page': '/',
    '/home': '/',
    '/contact': '/#quote',
    '/contact-us': '/#quote',
    '/services': '/#services',
    '/about': '/#about',
    '/about-us': '/#about',
  },
});
