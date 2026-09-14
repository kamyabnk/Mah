import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ADMIN_AUTH_SECRET: z.string().min(32, "ADMIN_AUTH_SECRET must be at least 32 characters"),
  CUSTOMER_AUTH_SECRET: z.string().min(32, "CUSTOMER_AUTH_SECRET must be at least 32 characters"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

function resolveEnv(): Env {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}

export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return resolveEnv()[prop as keyof Env];
  },
});
