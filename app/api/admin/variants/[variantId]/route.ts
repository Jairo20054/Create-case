import type { Prisma } from "@/generated/prisma/client";
import { apiError, AdminValidationError } from "@/lib/server/api-response";
import { requireAdmin } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { compatibilityConfigurationError, variantAdminPatchSchema } from "@/lib/validation/commerce";

export async function PATCH(request: Request, context: { params: Promise<{ variantId: string }> }) {
  try {
    await requireAdmin(request);
    const { variantId } = await context.params;
    const input = variantAdminPatchSchema.parse(await request.json());
    const prisma = getPrisma();
    const current = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { compatibilityMode: true } }, deviceCompatibility: true, brandCompatibility: true, inventory: true },
    });
    if (!current) throw new AdminValidationError("VARIANT_NOT_FOUND", "La variante no existe.");
    const deviceIds = input.deviceIds ?? current.deviceCompatibility.map((item) => item.deviceId);
    const brandIds = input.brandIds ?? current.brandCompatibility.map((item) => item.brandId);
    const configError = compatibilityConfigurationError(current.product.compatibilityMode, deviceIds, brandIds);
    if (configError) throw new AdminValidationError(configError, "La configuración de compatibilidad no corresponde al modo del producto.");
    const quantity = input.quantity ?? current.inventory?.quantity ?? 0;
    const reservedQuantity = input.reservedQuantity ?? current.inventory?.reservedQuantity ?? 0;
    if (reservedQuantity > quantity) throw new AdminValidationError("INVALID_RESERVED_QUANTITY", "La cantidad reservada no puede superar el inventario físico.");

    const capabilityCodes = input.requiredCapabilities ?? [];
    const [activeDevices, activeBrands, capabilities] = await Promise.all([
      prisma.device.findMany({ where: { id: { in: deviceIds }, isActive: true }, select: { id: true } }),
      prisma.deviceBrand.findMany({ where: { id: { in: brandIds }, isActive: true }, select: { id: true } }),
      input.requiredCapabilities ? prisma.capability.findMany({ where: { code: { in: capabilityCodes } }, select: { id: true, code: true } }) : Promise.resolve([]),
    ]);
    if (activeDevices.length !== deviceIds.length) throw new AdminValidationError("INVALID_DEVICE", "Uno o más dispositivos no existen o están inactivos.");
    if (activeBrands.length !== brandIds.length) throw new AdminValidationError("INVALID_BRAND", "Una o más marcas no existen o están inactivas.");
    if (input.requiredCapabilities && capabilities.length !== capabilityCodes.length) throw new AdminValidationError("INVALID_CAPABILITY", "Una o más capacidades tecnológicas no existen.");
    const capabilityByCode = new Map(capabilities.map((capability) => [capability.code, capability.id]));
    const variantData: Prisma.ProductVariantUpdateInput = {
      sku: input.sku,
      name: input.name,
      color: input.color,
      design: input.design,
      material: input.material,
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      cost: input.cost,
      imageUrl: input.imageUrl,
      isActive: input.isActive,
    };

    await prisma.$transaction(async (transaction) => {
      await transaction.productVariant.update({ where: { id: variantId }, data: variantData });
      await transaction.inventory.upsert({
        where: { productVariantId: variantId },
        update: { quantity, reservedQuantity, lowStockThreshold: input.lowStockThreshold },
        create: { productVariantId: variantId, quantity, reservedQuantity, lowStockThreshold: input.lowStockThreshold ?? 5 },
      });
      if (input.deviceIds) {
        await transaction.productVariantDevice.deleteMany({ where: { productVariantId: variantId } });
        if (deviceIds.length) await transaction.productVariantDevice.createMany({ data: deviceIds.map((deviceId) => ({ productVariantId: variantId, deviceId })) });
      }
      if (input.brandIds) {
        await transaction.productVariantBrand.deleteMany({ where: { productVariantId: variantId } });
        if (brandIds.length) await transaction.productVariantBrand.createMany({ data: brandIds.map((brandId) => ({ productVariantId: variantId, brandId })) });
      }
      if (input.requiredCapabilities) {
        await transaction.variantCapabilityRequirement.deleteMany({ where: { productVariantId: variantId } });
        if (capabilityCodes.length) await transaction.variantCapabilityRequirement.createMany({ data: capabilityCodes.map((code) => ({ productVariantId: variantId, capabilityId: capabilityByCode.get(code)!, isRequired: true })) });
      }
    });
    return Response.json({ variant: { id: variantId } });
  } catch (error) {
    return apiError(error);
  }
}
