// Client-only Vite build used by the Electron desktop app.
// The web app keeps using vite.config.ts (TanStack Start SSR).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  root: "electron/renderer",
  base: "/",
  plugins: [react(), tailwindcss(), tsConfigPaths({ root: import.meta.dirname })],
  define: { "import.meta.env.VITE_ELECTRON": JSON.stringify("true") },
  build: {
    outDir: "../../dist-electron",
    emptyOutDir: true,
  },
});
