import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages project site: https://<user>.github.io/aetherpath/
  base: process.env.VITE_BASE ?? "/",
  server: {
    port: 5173,
    host: true,
  },
});
