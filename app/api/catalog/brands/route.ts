import { apiError } from "@/lib/server/api-response";
import { getActiveBrands } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ brands: await getActiveBrands() });
  } catch (error) {
    return apiError(error);
  }
}
