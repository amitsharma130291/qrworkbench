import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://qrgrid.example.com",
  trailingSlash: "never",
  devToolbar: { enabled: false },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 4321
  }
});
