import type { CommerceErrorCode } from "./errors";

export type CompatibilityMode = "UNIVERSAL" | "BRAND_SPECIFIC" | "DEVICE_SPECIFIC";

export type CompatibilitySnapshot = {
  deviceSelected: boolean;
  deviceExists: boolean;
  deviceActive: boolean;
  deviceId?: string;
  deviceBrandId?: string;
  deviceCapabilities: string[];
  productExists: boolean;
  productActive: boolean;
  compatibilityMode?: CompatibilityMode;
  variantExists: boolean;
  variantActive: boolean;
  exactDeviceIds: string[];
  compatibleBrandIds: string[];
  requiredCapabilities: string[];
  availableStock: number;
  requestedQuantity: number;
};

export type CompatibilityDecision =
  | { ok: true; availableStock: number }
  | { ok: false; code: CommerceErrorCode };

export function evaluateCompatibility(input: CompatibilitySnapshot): CompatibilityDecision {
  if (!input.deviceSelected) return { ok: false, code: "DEVICE_REQUIRED" };
  if (!input.deviceExists) return { ok: false, code: "DEVICE_NOT_FOUND" };
  if (!input.deviceActive) return { ok: false, code: "DEVICE_INACTIVE" };
  if (!input.productExists) return { ok: false, code: "PRODUCT_NOT_FOUND" };
  if (!input.productActive) return { ok: false, code: "PRODUCT_INACTIVE" };
  if (!input.variantExists) return { ok: false, code: "VARIANT_NOT_FOUND" };
  if (!input.variantActive) return { ok: false, code: "VARIANT_INACTIVE" };

  const physicallyCompatible =
    input.compatibilityMode === "UNIVERSAL" ||
    (input.compatibilityMode === "DEVICE_SPECIFIC" && Boolean(input.deviceId) && input.exactDeviceIds.includes(input.deviceId!)) ||
    (input.compatibilityMode === "BRAND_SPECIFIC" && Boolean(input.deviceBrandId) && input.compatibleBrandIds.includes(input.deviceBrandId!));

  const capabilitySet = new Set(input.deviceCapabilities);
  const hasEveryRequiredCapability = input.requiredCapabilities.every((code) => capabilitySet.has(code));
  if (!physicallyCompatible || !hasEveryRequiredCapability) return { ok: false, code: "INCOMPATIBLE_DEVICE" };
  if (input.availableStock <= 0) return { ok: false, code: "OUT_OF_STOCK" };
  if (input.requestedQuantity > input.availableStock) return { ok: false, code: "INSUFFICIENT_STOCK" };

  return { ok: true, availableStock: input.availableStock };
}
