import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL o DATABASE_URL es obligatoria para ejecutar el seed");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const capabilityNames: Record<string, string> = {
  MAGSAFE: "MagSafe",
  QI: "Carga inalámbrica Qi",
  QI2: "Carga inalámbrica Qi2",
  NFC: "NFC",
  USB_C: "USB-C",
  LIGHTNING: "Lightning",
  POWER_DELIVERY: "Power Delivery",
  WIRELESS_CHARGING: "Carga inalámbrica",
};

type DeviceSeed = {
  brand: string;
  name: string;
  slug: string;
  releaseYear: number;
  modelCode?: string;
  capabilities: string[];
};

type VariantSeed = {
  sku: string;
  name: string;
  color: string;
  design: string;
  material: string;
  price: string;
  quantity: number;
  devices: string[];
  brands?: string[];
  requirements: string[];
};

type ProductSeed = {
  slug: string;
  name: string;
  productType: "CASE" | "SCREEN_PROTECTOR" | "CHARGER" | "WALLET";
  compatibilityMode: "DEVICE_SPECIFIC" | "UNIVERSAL" | "BRAND_SPECIFIC";
  description: string;
  tags: string[];
  image: string;
  variants: VariantSeed[];
};

const devices: DeviceSeed[] = [
  { brand: "apple", name: "iPhone 15 Pro", slug: "iphone-15-pro", releaseYear: 2023, modelCode: "A2848", capabilities: ["MAGSAFE", "QI", "QI2", "NFC", "USB_C", "POWER_DELIVERY", "WIRELESS_CHARGING"] },
  { brand: "apple", name: "iPhone 15 Pro Max", slug: "iphone-15-pro-max", releaseYear: 2023, modelCode: "A2849", capabilities: ["MAGSAFE", "QI", "QI2", "NFC", "USB_C", "POWER_DELIVERY", "WIRELESS_CHARGING"] },
  { brand: "samsung", name: "Samsung Galaxy S24", slug: "galaxy-s24", releaseYear: 2024, modelCode: "SM-S921", capabilities: ["QI", "NFC", "USB_C", "POWER_DELIVERY", "WIRELESS_CHARGING"] },
  { brand: "samsung", name: "Samsung Galaxy S24 Ultra", slug: "galaxy-s24-ultra", releaseYear: 2024, modelCode: "SM-S928", capabilities: ["QI", "NFC", "USB_C", "POWER_DELIVERY", "WIRELESS_CHARGING"] },
  { brand: "samsung", name: "Samsung Galaxy A55", slug: "galaxy-a55", releaseYear: 2024, modelCode: "SM-A556", capabilities: ["NFC", "USB_C"] },
  { brand: "xiaomi", name: "Xiaomi 14", slug: "xiaomi-14", releaseYear: 2024, capabilities: ["QI", "NFC", "USB_C", "POWER_DELIVERY", "WIRELESS_CHARGING"] },
  { brand: "motorola", name: "Motorola Edge 50", slug: "motorola-edge-50", releaseYear: 2024, capabilities: ["NFC", "USB_C", "POWER_DELIVERY"] },
  { brand: "honor", name: "Honor 200", slug: "honor-200", releaseYear: 2024, capabilities: ["NFC", "USB_C", "POWER_DELIVERY"] },
];

async function seed() {
  const brandNames = ["Apple", "Samsung", "Xiaomi", "Motorola", "Honor"];
  const brands = new Map<string, { id: string }>();
  for (const name of brandNames) {
    const slug = name.toLowerCase();
    const brand = await prisma.deviceBrand.upsert({
      where: { slug },
      update: { name, isActive: true },
      create: { name, slug, isActive: true },
      select: { id: true },
    });
    brands.set(slug, brand);
  }

  const capabilities = new Map<string, { id: string }>();
  for (const [code, name] of Object.entries(capabilityNames)) {
    const capability = await prisma.capability.upsert({
      where: { code },
      update: { name },
      create: { code, name },
      select: { id: true },
    });
    capabilities.set(code, capability);
  }

  const deviceIds = new Map<string, string>();
  for (const item of devices) {
    const brandId = brands.get(item.brand)?.id;
    if (!brandId) throw new Error(`Marca no encontrada: ${item.brand}`);
    const device = await prisma.device.upsert({
      where: { brandId_slug: { brandId, slug: item.slug } },
      update: { name: item.name, releaseYear: item.releaseYear, modelCode: item.modelCode, isActive: true },
      create: { brandId, name: item.name, slug: item.slug, releaseYear: item.releaseYear, modelCode: item.modelCode, isActive: true },
      select: { id: true },
    });
    deviceIds.set(item.slug, device.id);
    for (const code of item.capabilities) {
      const capabilityId = capabilities.get(code)?.id;
      if (!capabilityId) throw new Error(`Capacidad no encontrada: ${code}`);
      await prisma.deviceCapability.upsert({
        where: { deviceId_capabilityId: { deviceId: device.id, capabilityId } },
        update: {},
        create: { deviceId: device.id, capabilityId },
      });
    }
  }

  const collection = await prisma.collection.upsert({
    where: { slug: "compatibility-lab" },
    update: { name: "COMPATIBILITY LAB", active: true },
    create: { name: "COMPATIBILITY LAB", slug: "compatibility-lab", description: "Referencias de demostración para verificar compatibilidad.", active: true },
  });

  const productSeeds: ProductSeed[] = [
    {
      slug: "chrome-x-demo", name: "Chrome X — Demo", productType: "CASE" as const, compatibilityMode: "DEVICE_SPECIFIC" as const,
      description: "Case de demostración con referencias físicas independientes para iPhone 15 Pro y Pro Max.", tags: ["MAGSAFE"],
      image: "https://images.unsplash.com/photo-1601593346740-925612772716?auto=format&fit=crop&w=1400&q=88",
      variants: [
        { sku: "DEMO-CHROME-IP15P-SIL", name: "iPhone 15 Pro / Plata", color: "Plata", design: "Metal líquido", material: "TPU + policarbonato", price: "89900", quantity: 18, devices: ["iphone-15-pro"], requirements: [] },
        { sku: "DEMO-CHROME-IP15PM-SIL", name: "iPhone 15 Pro Max / Plata", color: "Plata", design: "Metal líquido", material: "TPU + policarbonato", price: "94900", quantity: 8, devices: ["iphone-15-pro-max"], requirements: [] },
      ],
    },
    {
      slug: "shield-s24-demo", name: "Shield S24 — Demo", productType: "SCREEN_PROTECTOR" as const, compatibilityMode: "DEVICE_SPECIFIC" as const,
      description: "Protector de demostración cortado para cada pantalla; S24 y S24 Ultra no son intercambiables.", tags: [],
      image: "https://images.unsplash.com/photo-1616330316654-5dcae9c2e4d9?auto=format&fit=crop&w=1400&q=88",
      variants: [
        { sku: "DEMO-SHIELD-S24", name: "Galaxy S24", color: "Transparente", design: "Cristal 9H", material: "Vidrio templado", price: "39900", quantity: 12, devices: ["galaxy-s24"], requirements: [] },
        { sku: "DEMO-SHIELD-S24U", name: "Galaxy S24 Ultra", color: "Transparente", design: "Cristal 9H", material: "Vidrio templado", price: "44900", quantity: 9, devices: ["galaxy-s24-ultra"], requirements: [] },
      ],
    },
    {
      slug: "volt-usbc-demo", name: "Volt USB-C — Demo", productType: "CHARGER" as const, compatibilityMode: "UNIVERSAL" as const,
      description: "Cargador universal de demostración que exige puerto USB-C en el dispositivo seleccionado.", tags: ["USB_C", "POWER_DELIVERY"],
      image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=1400&q=82&sat=-35",
      variants: [
        { sku: "DEMO-VOLT-USBC-30W", name: "30 W / USB-C", color: "Grafito", design: "Industrial", material: "ABS", price: "139900", quantity: 11, devices: [], requirements: ["USB_C"] },
      ],
    },
    {
      slug: "orbit-wallet-demo", name: "Orbit Wallet — Demo", productType: "WALLET" as const, compatibilityMode: "BRAND_SPECIFIC" as const,
      description: "Billetera magnética de demostración configurada únicamente para Apple.", tags: ["MAGSAFE"],
      image: "https://images.unsplash.com/photo-1601593346740-925612772716?auto=format&fit=crop&w=1400&q=82&sat=-40",
      variants: [
        { sku: "DEMO-ORBIT-APPLE", name: "Apple / Negro", color: "Negro", design: "Utilitario", material: "Cuero vegano", price: "79900", quantity: 16, devices: [], brands: ["apple"], requirements: ["MAGSAFE"] },
      ],
    },
  ];

  for (const item of productSeeds) {
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: { name: item.name, description: item.description, productType: item.productType, compatibilityMode: item.compatibilityMode, isDemo: true, isActive: true, technologyTags: item.tags, collectionId: collection.id },
      create: { name: item.name, slug: item.slug, description: item.description, productType: item.productType, compatibilityMode: item.compatibilityMode, isDemo: true, isActive: true, technologyTags: item.tags, collectionId: collection.id },
    });
    await prisma.productImage.upsert({
      where: { id: product.id },
      update: { imageUrl: item.image, position: 0 },
      create: { id: product.id, productId: product.id, imageUrl: item.image, position: 0 },
    });

    for (const variantSeed of item.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: variantSeed.sku },
        update: { productId: product.id, name: variantSeed.name, color: variantSeed.color, design: variantSeed.design, material: variantSeed.material, price: variantSeed.price, imageUrl: item.image, isActive: true },
        create: { productId: product.id, sku: variantSeed.sku, name: variantSeed.name, color: variantSeed.color, design: variantSeed.design, material: variantSeed.material, price: variantSeed.price, imageUrl: item.image, isActive: true },
      });
      await prisma.inventory.upsert({
        where: { productVariantId: variant.id },
        update: { quantity: variantSeed.quantity, reservedQuantity: 0, lowStockThreshold: 5 },
        create: { productVariantId: variant.id, quantity: variantSeed.quantity, reservedQuantity: 0, lowStockThreshold: 5 },
      });
      for (const slug of variantSeed.devices) {
        const deviceId = deviceIds.get(slug);
        if (!deviceId) throw new Error(`Dispositivo no encontrado: ${slug}`);
        await prisma.productVariantDevice.upsert({
          where: { productVariantId_deviceId: { productVariantId: variant.id, deviceId } },
          update: {},
          create: { productVariantId: variant.id, deviceId },
        });
      }
      for (const brandSlug of variantSeed.brands ?? []) {
        const brandId = brands.get(brandSlug)?.id;
        if (!brandId) throw new Error(`Marca no encontrada: ${brandSlug}`);
        await prisma.productVariantBrand.upsert({
          where: { productVariantId_brandId: { productVariantId: variant.id, brandId } },
          update: {},
          create: { productVariantId: variant.id, brandId },
        });
      }
      for (const code of variantSeed.requirements) {
        const capabilityId = capabilities.get(code)?.id;
        if (!capabilityId) throw new Error(`Capacidad no encontrada: ${code}`);
        await prisma.variantCapabilityRequirement.upsert({
          where: { productVariantId_capabilityId: { productVariantId: variant.id, capabilityId } },
          update: { isRequired: true },
          create: { productVariantId: variant.id, capabilityId, isRequired: true },
        });
      }
    }
  }
}

seed()
  .then(() => console.log("Seed idempotente de compatibilidad completado"))
  .finally(() => prisma.$disconnect());
