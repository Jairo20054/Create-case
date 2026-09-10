import { apiError } from "@/lib/server/api-response";
import { requireAdmin } from "@/lib/server/auth";
import { getCompatibilityDiagnostics } from "@/lib/server/catalog";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return Response.json({ issues: await getCompatibilityDiagnostics() });
  } catch (error) {
    return apiError(error);
  }
}
