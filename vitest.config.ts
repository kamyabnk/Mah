import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
