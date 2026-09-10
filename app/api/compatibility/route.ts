import { z } from "zod";
import { apiError } from "@/lib/server/api-response";
import { validateCartItemCompatibility } from "@/lib/server/compatibility";

const inputSchema = z.object({ variantId: z.string().uuid(), deviceId: z.string().uuid(), quantity: z.number().int().positive().default(1) }).strict();

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    return Response.json({ compatible: true, item: await validateCartItemCompatibility(input.variantId, input.deviceId, input.quantity) });
  } catch (error) {
    return apiError(error);
  }
}
