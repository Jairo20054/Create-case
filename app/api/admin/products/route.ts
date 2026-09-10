import { apiError, AdminValidationError } from "@/lib/server/api-response";
import { requireAdmin } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { compatibilityConfigurationError, productCreateSchema } from "@/lib/validation/commerce";

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const input = productCreateSchema.parse(await request.json());
    for (const variant of input.variants) {
      const code = compatibilityConfigurationError(input.compatibilityMode, variant.deviceIds, variant.brandIds);
      if (code) throw new AdminValidationError(code, "La configuración de compatibilidad no corresponde al modo del producto.");
    }

    const prisma = getPrisma();
    const deviceIds = [...new Set(input.variants.flatMap((variant) => variant.deviceIds))];
    const brandIds = [...new Set(input.variants.flatMap((variant) => variant.brandIds))];
    const capabilityCodes = [...new Set(input.variants.flatMap((variant) => variant.requiredCapabilities))];
    const [activeDevices, activeBrands, capabilities] = await Promise.all([
      prisma.device.findMany({ where: { id: { in: deviceIds }, isActive: true }, select: { id: true } }),
      prisma.deviceBrand.findMany({ where: { id: { in: brandIds }, isActive: true }, select: { id: true } }),
      prisma.capability.findMany({ where: { code: { in: capabilityCodes } }, select: { id: true, code: true } }),
    ]);
    if (activeDevices.length !== deviceIds.length) throw new AdminValidationError("INVALID_DEVICE", "Uno o más dispositivos no existen o están inactivos.");
    if (activeBrands.length !== brandIds.length) throw new AdminValidationError("INVALID_BRAND", "Una o más marcas no existen o están inactivas.");
    if (capabilities.length !== capabilityCodes.length) throw new AdminValidationError("INVALID_CAPABILITY", "Una o más capacidades tecnológicas no existen.");
    const capabilityByCode = new Map(capabilities.map((capability) => [capability.code, capability.id]));

    const product = await prisma.$transaction(async (transaction) => {
      const created = await transaction.product.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          productType: input.productType,
          compatibilityMode: input.compatibilityMode,
          isDemo: input.isDemo,
          isActive: input.isActive,
          isFeatured: input.isFeatured,
          technologyTags: input.technologyTags,
        },
      });
      for (const variant of input.variants) {
        await transaction.productVariant.create({
          data: {
            productId: created.id,
            sku: variant.sku,
            name: variant.name,
            color: variant.color,
            design: variant.design,
            material: variant.material,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            cost: variant.cost,
            imageUrl: variant.imageUrl,
            isActive: variant.isActive,
            inventory: { create: { quantity: variant.quantity, reservedQuantity: variant.reservedQuantity, lowStockThreshold: variant.lowStockThreshold } },
            deviceCompatibility: { create: variant.deviceIds.map((deviceId) => ({ deviceId })) },
            brandCompatibility: { create: variant.brandIds.map((brandId) => ({ brandId })) },
            requirements: { create: variant.requiredCapabilities.map((code) => ({ capabilityId: capabilityByCode.get(code)!, isRequired: true })) },
          },
        });
      }
      return created;
    });
    return Response.json({ product: { id: product.id, slug: product.slug } }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
