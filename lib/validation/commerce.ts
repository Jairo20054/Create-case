import { z } from "zod";

export const compatibilityModeSchema = z.enum(["UNIVERSAL", "BRAND_SPECIFIC", "DEVICE_SPECIFIC"]);
export const productTypeSchema = z.enum([
  "CASE", "SCREEN_PROTECTOR", "CAMERA_PROTECTOR", "CHARGER", "POWER_BANK",
  "WALLET", "STAND", "STRAP", "CHARM", "OTHER",
]);

export const cartItemInputSchema = z.object({
  productVariantId: z.string().uuid(),
  deviceId: z.string().uuid(),
  quantity: z.number().int().positive().max(99),
}).strict();

export const cartValidationInputSchema = z.object({
  items: z.array(cartItemInputSchema).min(1).max(50),
}).strict();

const moneySchema = z.coerce.number().nonnegative().finite();

export const variantAdminSchema = z.object({
  sku: z.string().trim().min(3).max(80),
  name: z.string().trim().max(120).optional(),
  color: z.string().trim().min(1).max(60),
  design: z.string().trim().max(120).optional(),
  material: z.string().trim().max(120).optional(),
  price: moneySchema,
  compareAtPrice: moneySchema.optional(),
  cost: moneySchema.optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  quantity: z.number().int().nonnegative(),
  reservedQuantity: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(5),
  deviceIds: z.array(z.string().uuid()).default([]),
  brandIds: z.array(z.string().uuid()).default([]),
  requiredCapabilities: z.array(z.string().trim().min(1)).default([]),
}).strict().superRefine((value, context) => {
  if (value.reservedQuantity > value.quantity) context.addIssue({ code: "custom", path: ["reservedQuantity"], message: "La cantidad reservada no puede superar el inventario físico." });
  for (const field of ["deviceIds", "brandIds", "requiredCapabilities"] as const) {
    if (new Set(value[field]).size !== value[field].length) context.addIssue({ code: "custom", path: [field], message: "No se permiten relaciones duplicadas." });
  }
});

export const variantAdminPatchSchema = z.object({
  sku: z.string().trim().min(3).max(80).optional(),
  name: z.string().trim().max(120).nullable().optional(),
  color: z.string().trim().min(1).max(60).optional(),
  design: z.string().trim().max(120).nullable().optional(),
  material: z.string().trim().max(120).nullable().optional(),
  price: moneySchema.optional(),
  compareAtPrice: moneySchema.nullable().optional(),
  cost: moneySchema.nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  quantity: z.number().int().nonnegative().optional(),
  reservedQuantity: z.number().int().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  deviceIds: z.array(z.string().uuid()).optional(),
  brandIds: z.array(z.string().uuid()).optional(),
  requiredCapabilities: z.array(z.string().trim().min(1)).optional(),
}).strict();

export const productCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(1),
  productType: productTypeSchema,
  compatibilityMode: compatibilityModeSchema,
  isDemo: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  technologyTags: z.array(z.string().trim().min(1)).default([]),
  variants: z.array(variantAdminSchema).min(1),
}).strict().superRefine((value, context) => {
  const skus=value.variants.map((variant)=>variant.sku);
  if(new Set(skus).size!==skus.length)context.addIssue({code:"custom",path:["variants"],message:"Los SKU deben ser únicos dentro del producto."});
  value.variants.forEach((variant,index)=>{
    const code=compatibilityConfigurationError(value.compatibilityMode,variant.deviceIds,variant.brandIds);
    if(code)context.addIssue({code:"custom",path:["variants",index],message:code});
  });
});

export function compatibilityConfigurationError(
  mode: z.infer<typeof compatibilityModeSchema>,
  deviceIds: string[],
  brandIds: string[],
): string | null {
  if (mode === "DEVICE_SPECIFIC" && deviceIds.length === 0) return "DEVICE_COMPATIBILITY_REQUIRED";
  if (mode === "BRAND_SPECIFIC" && brandIds.length === 0) return "BRAND_COMPATIBILITY_REQUIRED";
  if (mode === "UNIVERSAL" && (deviceIds.length > 0 || brandIds.length > 0)) return "UNIVERSAL_RELATION_CONFLICT";
  if (mode === "DEVICE_SPECIFIC" && brandIds.length > 0) return "DEVICE_MODE_BRAND_CONFLICT";
  if (mode === "BRAND_SPECIFIC" && deviceIds.length > 0) return "BRAND_MODE_DEVICE_CONFLICT";
  return null;
}
