import { apiError } from '@/lib/server/api-response';
import { requireAdmin } from '@/lib/server/auth';
import { getPrisma } from '@/lib/server/prisma';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const orders = await getPrisma().order.findMany({
      orderBy: { createdAt: 'desc' }, take: 100,
      select: {
        id: true, orderNumber: true, status: true, subtotal: true, createdAt: true,
        items: { select: { id: true, quantity: true } },
      },
    });
    return Response.json({ orders: orders.map(order => ({
      id: order.id, orderNumber: order.orderNumber, status: order.status,
      subtotal: Number(order.subtotal), createdAt: order.createdAt.toISOString(),
      itemsCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}
