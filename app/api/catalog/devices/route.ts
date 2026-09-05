import { apiError } from "@/lib/server/api-response";
import { getActiveDevices } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return Response.json({ devices: await getActiveDevices(url.searchParams.get("brandId") ?? undefined, url.searchParams.get("q") ?? undefined) });
  } catch (error) {
    return apiError(error);
  }
}
