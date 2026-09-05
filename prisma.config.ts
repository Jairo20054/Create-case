import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // A syntactically valid fallback lets `prisma generate` run during builds.
    // Migration/seed commands still fail safely unless a real server-only URL exists.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://invalid:invalid@localhost:5432/invalid",
  },
});
