import { cartValidationInputSchema } from "@/lib/validation/commerce";
import { apiError } from "@/lib/server/api-response";
import { validateCartItemCompatibility } from "@/lib/server/compatibility";

export async function POST(request: Request) {
  try {
    const { items } = cartValidationInputSchema.parse(await request.json());
    const validated = await Promise.all(items.map((item) => validateCartItemCompatibility(item.productVariantId, item.deviceId, item.quantity)));
    return Response.json({
      items: validated,
      subtotal: validated.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    });
  } catch (error) {
    return apiError(error);
  }
}
