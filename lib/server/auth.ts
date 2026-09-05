import { createClient } from "@supabase/supabase-js";
import { getPrisma } from "./prisma";

export class AuthorizationError extends Error {
  constructor(message: string, public readonly status: 401 | 403) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getOptionalUser(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new AuthorizationError("La autenticación no está configurada.", 401);
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(authorization.slice(7));
  if (error || !data.user) throw new AuthorizationError("La sesión no es válida o expiró.", 401);
  return data.user;
}

export async function requireAdmin(request: Request) {
  const user = await getOptionalUser(request);
  if (!user) throw new AuthorizationError("Debes iniciar sesión.", 401);
  const profile = await getPrisma().profile.findUnique({ where: { id: user.id }, select: { role: true } });
  if (profile?.role !== "ADMIN") throw new AuthorizationError("No tienes permisos administrativos.", 403);
  return user;
}
