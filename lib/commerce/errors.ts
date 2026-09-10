export const commerceErrorCodes = [
  "DEVICE_REQUIRED",
  "DEVICE_NOT_FOUND",
  "DEVICE_INACTIVE",
  "PRODUCT_NOT_FOUND",
  "PRODUCT_INACTIVE",
  "VARIANT_NOT_FOUND",
  "VARIANT_INACTIVE",
  "INCOMPATIBLE_DEVICE",
  "OUT_OF_STOCK",
  "INSUFFICIENT_STOCK",
] as const;

export type CommerceErrorCode = (typeof commerceErrorCodes)[number];

export const commerceErrorMessages: Record<CommerceErrorCode, string> = {
  DEVICE_REQUIRED: "Selecciona el modelo exacto de tu celular antes de agregar este producto.",
  DEVICE_NOT_FOUND: "El dispositivo seleccionado no existe.",
  DEVICE_INACTIVE: "El dispositivo seleccionado no está disponible actualmente.",
  PRODUCT_NOT_FOUND: "El producto solicitado no existe.",
  PRODUCT_INACTIVE: "Este producto no está disponible actualmente.",
  VARIANT_NOT_FOUND: "La referencia seleccionada no existe.",
  VARIANT_INACTIVE: "La referencia seleccionada no está disponible actualmente.",
  INCOMPATIBLE_DEVICE: "Esta referencia no es compatible con el dispositivo seleccionado. Elige otra variante o cambia tu dispositivo.",
  OUT_OF_STOCK: "Esta referencia está agotada.",
  INSUFFICIENT_STOCK: "La cantidad solicitada supera el inventario disponible.",
};

export class CommerceError extends Error {
  constructor(
    public readonly code: CommerceErrorCode,
    message = commerceErrorMessages[code],
    public readonly status = code.endsWith("NOT_FOUND") ? 404 : 409,
  ) {
    super(message);
    this.name = "CommerceError";
  }
}
