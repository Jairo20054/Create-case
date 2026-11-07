// Fail-closed preflight before any database migration or seed.
const ref = process.env.ALTER_CASE_SUPABASE_PROJECT_REF?.trim();
if (!ref || !/^[a-z0-9]{15,30}$/i.test(ref)) {
  console.error('ALTER / CASE: primero identifica el Supabase exclusivo del proyecto.');
  process.exit(1);
}
const expectedHost = `${ref}.supabase.co`;
function matchesDatabase(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ['postgresql:', 'postgres:'].includes(url.protocol) && (
      url.hostname === `db.${ref}.supabase.co` ||
      (url.hostname.endsWith('.pooler.supabase.com') &&
        decodeURIComponent(url.username).endsWith(`.${ref}`))
    );
  } catch { return false; }
}
try {
  const auth = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
  if (auth.protocol !== 'https:' || auth.hostname !== expectedHost ||
      !matchesDatabase(process.env.DATABASE_URL) ||
      !matchesDatabase(process.env.DIRECT_URL)) throw new Error('Unverified project');
  console.log('ALTER / CASE: identificadores del proyecto y URLs de base coinciden.');
} catch {
  console.error('ALTER / CASE: URLs inconsistentes. No se ejecutarán migraciones ni semillas.');
  process.exit(1);
}
