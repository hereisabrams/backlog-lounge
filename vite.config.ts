import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { apiRoutes } from "./dev/api-routes.ts";

export default defineConfig(({ mode }) => {
  // The dev API routes read server-only keys (RAWG_API_KEY, AI_GATEWAY_API_KEY) from .env.local like Vercel would.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss(), apiRoutes()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: { port: 5480, strictPort: true },
    test: { environment: "jsdom", globals: true },
  };
});
