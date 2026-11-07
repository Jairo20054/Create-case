import { Prisma } from '@/generated/prisma/client';
import { z } from 'zod';
import { apiError, AdminValidationError } from '@/lib/server/api-response';
import { requireAdmin } from '@/lib/server/auth';
import { getPrisma } from '@/lib/server/prisma';

const transitions: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};
const schema = z.object({ status: z.enum(['confirmed', 'preparing', 'shipped', 'delivered', 'cancelled']) }).strict();

export async function PATCH(request: Request, context: { params: Promise<{ orderId: string }> }) {
  try {
    await requireAdmin(request);
    const { orderId } = await context.params;
    if (!z.string().uuid().safeParse(orderId).success) throw new AdminValidationError('INVALID_ID', 'El pedido no es válido.');
    const { status } = schema.parse(await request.json());
    const prisma = getPrisma();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const order = await prisma.$transaction(async tx => {
          const current = await tx.order.findUnique({ where: { id: orderId },
            include: { items: { select: { variantId: true, quantity: true } } } });
          if (!current) throw new AdminValidationError('ORDER_NOT_FOUND', 'El pedido no existe.');
          if (current.status === status) return current;
          if (!transitions[current.status]?.includes(status))
            throw new AdminValidationError('INVALID_TRANSITION', 'Este cambio de estado no está permitido.');
          // Only newly created AC-UUID orders reserve stock. Historical orders need manual reconciliation.
          const reservedOrder = /^AC-[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(current.orderNumber);
          if (reservedOrder && (status === 'cancelled' || status === 'shipped')) {
            for (const line of current.items) {
              if (!line.variantId) throw new AdminValidationError('MISSING_VARIANT', 'Este pedido necesita conciliación manual.');
              const stock = await tx.inventory.findUnique({ where: { productVariantId: line.variantId } });
              if (!stock || stock.reservedQuantity < line.quantity || stock.quantity < line.quantity)
                throw new AdminValidationError('INVALID_RESERVATION', 'Las reservas no coinciden. Revisa el inventario antes de continuar.');
              await tx.inventory.update({ where: { productVariantId: line.variantId },
                data: { reservedQuantity: { decrement: line.quantity },
                  ...(status === 'shipped' ? { quantity: { decrement: line.quantity } } : {}) } });
            }
          }
          return tx.order.update({ where: { id: current.id }, data: { status } });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 12000 });
        return Response.json({ order: { id: order.id, status: order.status } },
          { headers: { 'Cache-Control': 'private, no-store' } });
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'P2034' && attempt < 2) continue;
        throw error;
      }
    }
    throw new AdminValidationError('ORDER_RETRY_REQUIRED', 'No fue posible actualizar el pedido. Inténtalo de nuevo.');
  } catch (error) { return apiError(error); }
}
