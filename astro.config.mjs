import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://qrgrid.example.com",
  trailingSlash: "never",
  devToolbar: { enabled: false },
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/bulk") && !page.includes("/labels") && !page.includes("/docs"),
    }),
  ],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 4321
  }
});
