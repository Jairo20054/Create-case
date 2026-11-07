import { Prisma } from '@/generated/prisma/client';
import { z } from 'zod';
import { apiError, AdminValidationError } from '@/lib/server/api-response';
import { CommerceError } from '@/lib/commerce/errors';
import { getPrisma } from '@/lib/server/prisma';
import { validateCartItemCompatibility } from '@/lib/server/compatibility';
import { cartItemInputSchema } from '@/lib/validation/commerce';

export const runtime = 'nodejs';

const orderSchema = z.object({
  requestId: z.string().uuid(),
  customer: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().max(200),
  address: z.string().trim().min(6).max(240),
  city: z.string().trim().min(2).max(100),
  items: z.array(cartItemInputSchema).min(1).max(30),
}).strict().superRefine((value, ctx) => {
  const lines = value.items.map(item => item.productVariantId + ':' + item.deviceId);
  if (new Set(lines).size !== lines.length) ctx.addIssue({ code: 'custom', path: ['items'],
    message: 'No se pueden duplicar referencias en el mismo pedido.' });
});

export async function POST(request: Request) {
  try {
    const data = orderSchema.parse(await request.json());
    const prisma = getPrisma();
    const orderNumber = 'AC-' + data.requestId;
    // Compatibility is resolved by the existing server-side policy, never by product/brand text.
    const validated = await Promise.all(data.items.map(item =>
      validateCartItemCompatibility(item.productVariantId, item.deviceId, item.quantity)));
    let result: { id: string; orderNumber: string; subtotal: number; createdAt: string } | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await prisma.$transaction(async tx => {
          const previous = await tx.order.findUnique({ where: { orderNumber } });
          if (previous) return {
            id: previous.id, orderNumber: previous.orderNumber,
            subtotal: Number(previous.subtotal), createdAt: previous.createdAt.toISOString(),
          };
          let subtotal = 0;
          const lines: Array<{ variantId: string; productName: string; quantity: number; unitPrice: number }> = [];
          for (const item of validated) {
            const variant = await tx.productVariant.findUnique({
              where: { id: item.variantId },
              include: { product: { select: { name: true, isActive: true, isDemo: true } }, inventory: true },
            });
            if (!variant || !variant.isActive || !variant.product.isActive || variant.product.isDemo)
              throw new CommerceError('VARIANT_INACTIVE');
            const inventory = variant.inventory;
            if (!inventory || inventory.quantity - inventory.reservedQuantity < item.quantity)
              throw new CommerceError('INSUFFICIENT_STOCK');
            // Serializable isolation prevents two concurrent check-then-increment reservations.
            await tx.inventory.update({ where: { productVariantId: variant.id },
              data: { reservedQuantity: { increment: item.quantity } } });
            const unitPrice = Number(variant.price);
            subtotal += unitPrice * item.quantity;
            lines.push({ variantId: variant.id, productName: variant.product.name,
              quantity: item.quantity, unitPrice });
          }
          const created = await tx.order.create({
            data: {
              orderNumber, status: 'pending', subtotal,
              shippingAddress: { customer: data.customer, phone: data.phone, email: data.email,
                address: data.address, city: data.city, payment: 'pending_confirmation' },
              items: { create: lines },
            },
          });
          return { id: created.id, orderNumber: created.orderNumber,
            subtotal: Number(created.subtotal), createdAt: created.createdAt.toISOString() };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 12000 });
        break;
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'P2034' && attempt < 2) continue;
        // If a retry races with a successful commit, return the existing idempotent result.
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
          const existing = await prisma.order.findUnique({ where: { orderNumber } });
          if (existing) {
            result = { id: existing.id, orderNumber: existing.orderNumber,
              subtotal: Number(existing.subtotal), createdAt: existing.createdAt.toISOString() };
            break;
          }
        }
        throw error;
      }
    }
    if (!result) throw new AdminValidationError('ORDER_RETRY_REQUIRED', 'No se pudo reservar inventario. Inténtalo otra vez.');
    return Response.json({ order: { ...result, status: 'pending' } }, {
      status: 201, headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) { return apiError(error); }
}
