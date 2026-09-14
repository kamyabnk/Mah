import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.{ts,tsx}"],
    server: {
      deps: {
        inline: ["next", "next-auth"],
      },
    },
  },
});
