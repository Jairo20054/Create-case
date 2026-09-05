import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { alterCasePrisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (globalForPrisma.alterCasePrisma) return globalForPrisma.alterCasePrisma;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  if (process.env.NODE_ENV !== "production") globalForPrisma.alterCasePrisma = client;
  return client;
}
