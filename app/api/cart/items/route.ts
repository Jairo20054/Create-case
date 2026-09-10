import { cartItemInputSchema } from "@/lib/validation/commerce";
import { apiError } from "@/lib/server/api-response";
import { getOptionalUser } from "@/lib/server/auth";
import { validateCartItemCompatibility } from "@/lib/server/compatibility";
import { getPrisma } from "@/lib/server/prisma";

export async function POST(request: Request) {
  try {
    const input = cartItemInputSchema.parse(await request.json());
    const validated = await validateCartItemCompatibility(input.productVariantId, input.deviceId, input.quantity);
    const user = await getOptionalUser(request);
    if (!user) return Response.json({ item: validated, persisted: false });

    const prisma = getPrisma();
    await prisma.profile.upsert({
      where: { id: user.id },
      update: { email: user.email },
      create: { id: user.id, email: user.email },
    });
    const item = await prisma.cartItem.upsert({
      where: { userId_variantId_deviceId: { userId: user.id, variantId: validated.variantId, deviceId: validated.deviceId } },
      update: { quantity: validated.quantity, unitPrice: validated.unitPrice },
      create: { userId: user.id, variantId: validated.variantId, deviceId: validated.deviceId, quantity: validated.quantity, unitPrice: validated.unitPrice },
      select: { id: true },
    });
    return Response.json({ item: { ...validated, id: item.id }, persisted: true });
  } catch (error) {
    return apiError(error);
  }
}
