import { resolve } from "node:path";
import { z } from "zod";

const defaultCaseStorePath = resolve(
  process.cwd(),
  "artifacts",
  "cases",
  "mammography-second-opinion-cases.json",
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4030),
  CASE_STORE_PATH: z.string().min(1).default(defaultCaseStorePath),
  METRICS_ENABLED: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(env);
}