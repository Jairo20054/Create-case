import type { Prisma } from "@/generated/prisma/client";
import type { CatalogDevice, Product } from "@/lib/catalog";
import { evaluateCompatibility } from "@/lib/commerce/compatibility-policy";
import { realProductsFirst } from "@/lib/commerce/catalog-policy";
import { getPrisma } from "./prisma";

export type CatalogFilters = {
  productId?: string;
  deviceId?: string;
  includeDemo?: boolean;
  productType?: string;
  query?: string;
};

export async function getActiveBrands() {
  return getPrisma().deviceBrand.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, logoUrl: true },
    orderBy: { name: "asc" },
  });
}

export async function getActiveDevices(brandId?: string, query?: string): Promise<CatalogDevice[]> {
  const devices = await getPrisma().device.findMany({
    where: {
      isActive: true,
      brand: { isActive: true },
      ...(brandId ? { brandId } : {}),
      ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { modelCode: { contains: query, mode: "insensitive" } }] } : {}),
    },
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      capabilities: { select: { capability: { select: { code: true } } } },
    },
    orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
  });
  return devices.map((device) => ({
    id: device.id,
    name: device.name,
    slug: device.slug,
    modelCode: device.modelCode ?? undefined,
    brand: device.brand,
    capabilities: device.capabilities.map((item) => item.capability.code),
  }));
}

function categoryFor(productType: string, tags: string[]): Product["category"] {
  if (productType === "CASE" && tags.some((tag) => ["NFC", "E_INK", "MAGSAFE", "QI2"].includes(tag))) return "SMART";
  if (["CASE", "SCREEN_PROTECTOR", "CAMERA_PROTECTOR"].includes(productType)) return "CASES";
  return "ACCESSORIES";
}

export async function getCatalogProducts(filters: CatalogFilters = {}): Promise<{ products: Product[]; devices: CatalogDevice[] }> {
  const prisma = getPrisma();
  const where: Prisma.ProductWhereInput = {
    ...(filters.productId ? { id: filters.productId } : {}),
    isActive: true,
    ...(filters.includeDemo ? {} : { isDemo: false }),
    ...(filters.productType ? { productType: filters.productType as Prisma.EnumProductTypeFilter["equals"] } : {}),
    ...(filters.query ? { OR: [
      { name: { contains: filters.query, mode: "insensitive" } },
      { description: { contains: filters.query, mode: "insensitive" } },
      { variants: { some: { sku: { contains: filters.query, mode: "insensitive" } } } },
    ] } : {}),
  };
  const [products, devices] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        collection: { select: { name: true } },
        images: { orderBy: { position: "asc" } },
        variants: {
          where: { isActive: true },
          include: {
            inventory: true,
            deviceCompatibility: { select: { deviceId: true } },
            brandCompatibility: { select: { brandId: true } },
            requirements: { where: { isRequired: true }, select: { capability: { select: { code: true } } } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ isDemo: "asc" }, { isFeatured: "desc" }, { createdAt: "desc" }],
    }),
    getActiveDevices(),
  ]);
  const selectedDevice = filters.deviceId ? devices.find((device) => device.id === filters.deviceId) : undefined;

  const mapped = products.flatMap<Product>((product) => {
    const variants = product.variants.filter((variant) => {
      if (!filters.deviceId) return true;
      return evaluateCompatibility({
        deviceSelected: true,
        deviceExists: Boolean(selectedDevice),
        deviceActive: Boolean(selectedDevice),
        deviceId: selectedDevice?.id,
        deviceBrandId: selectedDevice?.brand.id,
        deviceCapabilities: selectedDevice?.capabilities ?? [],
        productExists: true,
        productActive: true,
        compatibilityMode: product.compatibilityMode,
        variantExists: true,
        variantActive: true,
        exactDeviceIds: variant.deviceCompatibility.map((item) => item.deviceId),
        compatibleBrandIds: variant.brandCompatibility.map((item) => item.brandId),
        requiredCapabilities: variant.requirements.map((item) => item.capability.code),
        availableStock: variant.inventory ? variant.inventory.quantity - variant.inventory.reservedQuantity : 0,
        requestedQuantity: 1,
      }).ok;
    });
    if (filters.deviceId && variants.length === 0) return [];
    const primaryVariant = variants[0] ?? product.variants[0];
    if (!primaryVariant) return [];
    const image = primaryVariant.imageUrl ?? product.images[0]?.imageUrl ?? "/placeholder-product.svg";
    const allDeviceIds = new Set(variants.flatMap((variant) => variant.deviceCompatibility.map((item) => item.deviceId)));
    const deviceNames = devices.filter((device) => allDeviceIds.has(device.id)).map((device) => device.name);
    const stocks = variants.map((variant) => Math.max(0, (variant.inventory?.quantity ?? 0) - (variant.inventory?.reservedQuantity ?? 0)));
    return [{
      id: product.id,
      slug: product.slug,
      name: product.name,
      collection: product.collection?.name ?? "ALTER / CASE",
      price: Math.min(...variants.map((variant) => Number(variant.price))),
      comparePrice: primaryVariant.compareAtPrice ? Number(primaryVariant.compareAtPrice) : undefined,
      tag: product.isDemo ? "EJEMPLO" : product.isFeatured ? "DESTACADO" : undefined,
      color: primaryVariant.color,
      colors: [...new Set(variants.map((variant) => variant.color))],
      models: product.compatibilityMode === "UNIVERSAL" ? ["Universal con requisitos"] : deviceNames,
      design: primaryVariant.design ?? "Diseño ALTER",
      image,
      alt: `${product.name}${product.isDemo ? " — producto de ejemplo" : ""}`,
      category: categoryFor(product.productType, product.technologyTags),
      productType: product.productType,
      compatibilityMode: product.compatibilityMode,
      isDemo: product.isDemo,
      stock: stocks.reduce((sum, stock) => sum + stock, 0),
      description: product.description,
      features: product.technologyTags,
      variants: variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        name: variant.name ?? undefined,
        color: variant.color,
        design: variant.design ?? undefined,
        material: variant.material ?? undefined,
        price: Number(variant.price),
        compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : undefined,
        imageUrl: variant.imageUrl ?? undefined,
        availableStock: Math.max(0, (variant.inventory?.quantity ?? 0) - (variant.inventory?.reservedQuantity ?? 0)),
        compatibleDeviceIds: variant.deviceCompatibility.map((item) => item.deviceId),
        compatibleBrandIds: variant.brandCompatibility.map((item) => item.brandId),
        requiredCapabilities: variant.requirements.map((item) => item.capability.code),
      })),
    }];
  });
  return { products: realProductsFirst(mapped), devices };
}

export async function getCompatibilityDiagnostics() {
  const variants = await getPrisma().productVariant.findMany({
    where: { isActive: true, product: { isActive: true } },
    include: {
      product: { select: { name: true, compatibilityMode: true } },
      deviceCompatibility: { include: { device: { select: { isActive: true } } } },
      brandCompatibility: { include: { brand: { select: { isActive: true } } } },
    },
    orderBy: { sku: "asc" },
  });
  return variants.flatMap((variant) => {
    const issues: string[] = [];
    if (variant.product.compatibilityMode === "DEVICE_SPECIFIC" && variant.deviceCompatibility.length === 0) issues.push("MISSING_DEVICE_COMPATIBILITY");
    if (variant.product.compatibilityMode === "BRAND_SPECIFIC" && variant.brandCompatibility.length === 0) issues.push("MISSING_BRAND_COMPATIBILITY");
    if (variant.product.compatibilityMode === "UNIVERSAL" && (variant.deviceCompatibility.length > 0 || variant.brandCompatibility.length > 0)) issues.push("CONTRADICTORY_UNIVERSAL_RELATION");
    if (variant.deviceCompatibility.some((item) => !item.device.isActive)) issues.push("INACTIVE_DEVICE_RELATION");
    if (variant.brandCompatibility.some((item) => !item.brand.isActive)) issues.push("INACTIVE_BRAND_RELATION");
    return issues.length ? [{ variantId: variant.id, sku: variant.sku, product: variant.product.name, issues }] : [];
  });
}
