import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://www.qrworkbench.com",
  trailingSlash: "never",
  devToolbar: { enabled: false },
  redirects: {
    "/batch-qr-code-generator": "/bulk-qr-code-generator",
  },
  integrations: [
    sitemap({
      // Keep in lockstep with every page that sets `noindex` in its own
      // Layout/AppLayout call (bulk.astro, labels.astro, docs.astro,
      // 404.astro) -- a page listed here but noindexed (or vice versa) is
      // exactly the inconsistency this filter exists to prevent.
      filter: (page) =>
        !page.endsWith("/bulk") &&
        !page.endsWith("/labels") &&
        !page.endsWith("/docs") &&
        !page.endsWith("/404"),
    }),
  ],
  adapter: vercel(),
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 4321
  }
});
