import { CommerceError } from "@/lib/commerce/errors";
import { evaluateCompatibility, type CompatibilitySnapshot } from "@/lib/commerce/compatibility-policy";
import { getPrisma } from "./prisma";
import { getCatalogProducts } from "./catalog";

const compatibilityInclude = {
  product: true,
  inventory: true,
  deviceCompatibility: { select: { deviceId: true } },
  brandCompatibility: { select: { brandId: true } },
  requirements: {
    where: { isRequired: true },
    select: { capability: { select: { code: true } } },
  },
} as const;

export async function getCompatibilitySnapshot(
  variantId: string | undefined,
  deviceId: string | undefined,
  requestedQuantity = 1,
): Promise<CompatibilitySnapshot & { unitPrice?: number; productName?: string; variantName?: string; imageUrl?: string; color?: string }> {
  const prisma = getPrisma();
  const [variant, device] = await Promise.all([
    variantId ? prisma.productVariant.findUnique({ where: { id: variantId }, include: compatibilityInclude }) : null,
    deviceId ? prisma.device.findUnique({
      where: { id: deviceId },
      include: { capabilities: { select: { capability: { select: { code: true } } } } },
    }) : null,
  ]);
  const availableStock = variant?.inventory
    ? Math.max(0, variant.inventory.quantity - variant.inventory.reservedQuantity)
    : 0;

  return {
    deviceSelected: Boolean(deviceId),
    deviceExists: Boolean(device),
    deviceActive: device?.isActive ?? false,
    deviceId: device?.id,
    deviceBrandId: device?.brandId,
    deviceCapabilities: device?.capabilities.map((item) => item.capability.code) ?? [],
    productExists: Boolean(variant?.product),
    productActive: variant?.product.isActive ?? false,
    compatibilityMode: variant?.product.compatibilityMode,
    variantExists: Boolean(variant),
    variantActive: variant?.isActive ?? false,
    exactDeviceIds: variant?.deviceCompatibility.map((item) => item.deviceId) ?? [],
    compatibleBrandIds: variant?.brandCompatibility.map((item) => item.brandId) ?? [],
    requiredCapabilities: variant?.requirements.map((item) => item.capability.code) ?? [],
    availableStock,
    requestedQuantity,
    unitPrice: variant ? Number(variant.price) : undefined,
    productName: variant?.product.name,
    variantName: variant?.name ?? undefined,
    imageUrl: variant?.imageUrl ?? undefined,
    color: variant?.color,
  };
}

export async function validateCartItemCompatibility(variantId: string | undefined, deviceId: string | undefined, quantity: number) {
  const snapshot = await getCompatibilitySnapshot(variantId, deviceId, quantity);
  const decision = evaluateCompatibility(snapshot);
  if (!decision.ok) throw new CommerceError(decision.code);
  return {
    variantId: variantId!,
    deviceId: deviceId!,
    quantity,
    unitPrice: snapshot.unitPrice!,
    availableStock: decision.availableStock,
    productName: snapshot.productName!,
    variantName: snapshot.variantName,
    imageUrl: snapshot.imageUrl,
    color: snapshot.color!,
  };
}

export async function isVariantCompatibleWithDevice(variantId: string, deviceId: string) {
  const snapshot = await getCompatibilitySnapshot(variantId, deviceId, 1);
  return evaluateCompatibility(snapshot).ok;
}

export async function getCompatibleVariants(productId: string, deviceId: string) {
  const { products } = await getCatalogProducts({ productId, deviceId, includeDemo: true });
  return products[0]?.variants.map((variant) => variant.id) ?? [];
}

export async function getCompatibleProductsForDevice(deviceId: string, includeDemo = false) {
  const { products } = await getCatalogProducts({ deviceId, includeDemo });
  return products.map((product) => product.id);
}
