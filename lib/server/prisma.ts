import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { alterCasePrisma?: PrismaClient };

/**
 * Fail closed unless both URLs identify the explicitly approved ALTER / CASE project.
 * This guards against accidentally connecting a credential belonging to another app.
 */
export function assertAlterCaseDatabaseTarget() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL_NOT_CONFIGURED');
  const ref = process.env.ALTER_CASE_SUPABASE_PROJECT_REF?.trim();
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!ref || !/^[a-z0-9]{15,30}$/i.test(ref) || !publicUrl)
    throw new Error('DATABASE_TARGET_UNVERIFIED');
  try {
    const db = new URL(connectionString);
    const auth = new URL(publicUrl);
    const correctAuth = auth.protocol === 'https:' && auth.hostname === `${ref}.supabase.co`;
    const correctDb = db.protocol === 'postgresql:' || db.protocol === 'postgres:';
    const correctHost = db.hostname === `db.${ref}.supabase.co` ||
      (db.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(db.username).endsWith(`.${ref}`));
    if (!correctAuth || !correctDb || !correctHost) throw new Error('DATABASE_TARGET_UNVERIFIED');
  } catch {
    throw new Error('DATABASE_TARGET_UNVERIFIED');
  }
  return connectionString;
}

export function getPrisma(): PrismaClient {
  const connectionString = assertAlterCaseDatabaseTarget();
  if (globalForPrisma.alterCasePrisma) return globalForPrisma.alterCasePrisma;
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  globalForPrisma.alterCasePrisma = client;
  return client;
}
