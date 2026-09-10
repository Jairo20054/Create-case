import { apiError } from "@/lib/server/api-response";
import { getCatalogProducts } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeDemo = url.searchParams.get("includeDemo") === "true";
    const result = await getCatalogProducts({
      deviceId: url.searchParams.get("deviceId") ?? undefined,
      productType: url.searchParams.get("productType") ?? undefined,
      query: url.searchParams.get("q") ?? undefined,
      includeDemo,
    });
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
