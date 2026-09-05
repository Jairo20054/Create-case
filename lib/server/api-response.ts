import { ZodError } from "zod";
import { CommerceError } from "@/lib/commerce/errors";
import { AuthorizationError } from "./auth";

export class AdminValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "AdminValidationError";
  }
}

export function apiError(error: unknown) {
  if (error instanceof CommerceError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  if (error instanceof AuthorizationError) return Response.json({ error: { code: error.status === 403 ? "FORBIDDEN" : "UNAUTHORIZED", message: error.message } }, { status: error.status });
  if (error instanceof AdminValidationError) return Response.json({ error: { code: error.code, message: error.message } }, { status: 400 });
  if (error instanceof ZodError) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Los datos enviados no son válidos.", details: error.flatten() } }, { status: 400 });
  if (error instanceof Error && error.message === "DATABASE_URL_NOT_CONFIGURED") {
    return Response.json({ error: { code: "DATABASE_NOT_CONFIGURED", message: "El catálogo todavía no está conectado a PostgreSQL." } }, { status: 503 });
  }
  console.error("Unhandled API error", error);
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "No fue posible completar la solicitud." } }, { status: 500 });
}
