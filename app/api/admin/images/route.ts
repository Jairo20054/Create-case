import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { apiError, AdminValidationError } from '@/lib/server/api-response';
import { requireAdmin } from '@/lib/server/auth';

export const runtime = 'nodejs';
const BUCKET = 'alter-case-products';
const MAX_BYTES = 5 * 1024 * 1024;
const types = new Map([
  ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'],
]);
function hasValidSignature(data: Uint8Array, type: string) {
  if (type === 'image/jpeg') return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (type === 'image/png') return data.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i) => data[i] === v);
  if (type === 'image/webp') return data.length >= 12 &&
    String.fromCharCode(...data.slice(0,4)) === 'RIFF' && String.fromCharCode(...data.slice(8,12)) === 'WEBP';
  return false;
}
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return Response.json({ error: { code: 'STORAGE_NOT_CONFIGURED',
      message: 'Primero configura el Supabase exclusivo de ALTER / CASE y su bucket público de catálogo.' } }, { status: 503 });
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_BYTES + 128_000) throw new AdminValidationError('FILE_TOO_LARGE', 'El archivo supera el límite de 5 MB.');
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new AdminValidationError('FILE_REQUIRED', 'Selecciona una imagen.');
    const ext = types.get(file.type);
    if (!ext || file.size < 12 || file.size > MAX_BYTES) throw new AdminValidationError('INVALID_FILE', 'Solo JPG, PNG o WebP de hasta 5 MB.');
    const buffer = new Uint8Array(await file.arrayBuffer());
    if (!hasValidSignature(buffer, file.type)) throw new AdminValidationError('INVALID_FILE_CONTENT', 'El archivo no corresponde a una imagen válida.');
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const path = `catalog/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: false, cacheControl: '3600' });
    if (error) return Response.json({ error: { code: 'UPLOAD_FAILED',
      message: 'No fue posible guardar la imagen. Verifica el bucket y sus políticas.' } }, { status: 502 });
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return Response.json({ imageUrl: data.publicUrl, path }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
