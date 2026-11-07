import { z } from 'zod';
import { apiError, AdminValidationError } from '@/lib/server/api-response';
import { requireAdmin } from '@/lib/server/auth';
import { getPrisma } from '@/lib/server/prisma';

const patchSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
}).strict().refine(value => Object.keys(value).length > 0, { message: 'Indica un campo para modificar.' });

export async function PATCH(request: Request, context: { params: Promise<{ productId: string }> }) {
  try {
    await requireAdmin(request);
    const { productId } = await context.params;
    if (!z.string().uuid().safeParse(productId).success) throw new AdminValidationError('INVALID_ID', 'Identificador incorrecto.');
    const input = patchSchema.parse(await request.json());
    const prisma = getPrisma();
    const existing = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!existing) throw new AdminValidationError('PRODUCT_NOT_FOUND', 'No encontramos el producto.');
    const product = await prisma.product.update({ where: { id: productId }, data: input,
      select: { id: true, name: true, isActive: true, isFeatured: true } });
    return Response.json({ product }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}
