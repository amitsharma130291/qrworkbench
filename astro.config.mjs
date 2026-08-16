import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

export default defineConfig({
  // TODO: swap in the real domain once registered — sitemap URLs, canonical
  // tags, and OG tags are all keyed off this.
  site: "https://qrgrid.example.com",
  trailingSlash: "never",
  devToolbar: { enabled: false },
  redirects: {
    "/batch-qr-code-generator": "/bulk-qr-code-generator",
  },
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith("/bulk") && !page.endsWith("/labels") && !page.endsWith("/docs"),
    }),
  ],
  adapter: vercel(),
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 4321
  }
});
