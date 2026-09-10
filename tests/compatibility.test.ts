import { describe, expect, it } from "vitest";
import { evaluateCompatibility, type CompatibilitySnapshot } from "../lib/commerce/compatibility-policy";
import { cartItemInputSchema, productCreateSchema, variantAdminSchema } from "../lib/validation/commerce";
import { includeDemoProducts, realProductsFirst } from "../lib/commerce/catalog-policy";

const iphone15Pro = "00000000-0000-4000-8000-000000000001";
const iphone15ProMax = "00000000-0000-4000-8000-000000000002";
const samsungS24 = "00000000-0000-4000-8000-000000000003";
const samsungS24Ultra = "00000000-0000-4000-8000-000000000004";
const apple = "00000000-0000-4000-8000-000000000011";

function snapshot(overrides: Partial<CompatibilitySnapshot> = {}): CompatibilitySnapshot {
  return {
    deviceSelected: true,
    deviceExists: true,
    deviceActive: true,
    deviceId: iphone15Pro,
    deviceBrandId: apple,
    deviceCapabilities: ["USB_C", "MAGSAFE", "QI2"],
    productExists: true,
    productActive: true,
    compatibilityMode: "DEVICE_SPECIFIC",
    variantExists: true,
    variantActive: true,
    exactDeviceIds: [iphone15Pro],
    compatibleBrandIds: [],
    requiredCapabilities: [],
    availableStock: 10,
    requestedQuantity: 1,
    ...overrides,
  };
}

describe("motor de compatibilidad", () => {
  it("rechaza un case de iPhone 15 Pro para iPhone 15 Pro Max", () => {
    expect(evaluateCompatibility(snapshot({ deviceId: iphone15ProMax })).ok).toBe(false);
  });
  it("rechaza un protector Galaxy S24 para Galaxy S24 Ultra", () => {
    expect(evaluateCompatibility(snapshot({ deviceId: samsungS24Ultra, exactDeviceIds: [samsungS24] }))).toEqual({ ok: false, code: "INCOMPATIBLE_DEVICE" });
  });
  it("acepta una variante compatible con stock", () => expect(evaluateCompatibility(snapshot()).ok).toBe(true));
  it("rechaza una combinación incompatible", () => expect(evaluateCompatibility(snapshot({ exactDeviceIds: [] }))).toEqual({ ok: false, code: "INCOMPATIBLE_DEVICE" }));
  it("rechaza una variante agotada", () => expect(evaluateCompatibility(snapshot({ availableStock: 0 }))).toEqual({ ok: false, code: "OUT_OF_STOCK" }));
  it("rechaza una variante inactiva", () => expect(evaluateCompatibility(snapshot({ variantActive: false }))).toEqual({ ok: false, code: "VARIANT_INACTIVE" }));
  it("rechaza un producto inactivo", () => expect(evaluateCompatibility(snapshot({ productActive: false }))).toEqual({ ok: false, code: "PRODUCT_INACTIVE" }));
  it("rechaza un dispositivo inactivo", () => expect(evaluateCompatibility(snapshot({ deviceActive: false }))).toEqual({ ok: false, code: "DEVICE_INACTIVE" }));
  it("acepta un universal cuando cumple todos los requisitos", () => expect(evaluateCompatibility(snapshot({ compatibilityMode: "UNIVERSAL", exactDeviceIds: [], requiredCapabilities: ["USB_C", "QI2"] })).ok).toBe(true));
  it("rechaza un universal cuando falta un requisito obligatorio", () => expect(evaluateCompatibility(snapshot({ compatibilityMode: "UNIVERSAL", exactDeviceIds: [], requiredCapabilities: ["USB_C", "LIGHTNING"] }))).toEqual({ ok: false, code: "INCOMPATIBLE_DEVICE" }));
  it("acepta compatibilidad por marca", () => expect(evaluateCompatibility(snapshot({ compatibilityMode: "BRAND_SPECIFIC", exactDeviceIds: [], compatibleBrandIds: [apple] })).ok).toBe(true));
  it("exige un dispositivo", () => expect(evaluateCompatibility(snapshot({ deviceSelected: false, deviceExists: false }))).toEqual({ ok: false, code: "DEVICE_REQUIRED" }));
  it("rechaza dispositivos inexistentes", () => expect(evaluateCompatibility(snapshot({ deviceExists: false }))).toEqual({ ok: false, code: "DEVICE_NOT_FOUND" }));
  it("rechaza variantes inexistentes", () => expect(evaluateCompatibility(snapshot({ variantExists: false }))).toEqual({ ok: false, code: "VARIANT_NOT_FOUND" }));
  it("rechaza productos inexistentes", () => expect(evaluateCompatibility(snapshot({ productExists: false }))).toEqual({ ok: false, code: "PRODUCT_NOT_FOUND" }));
  it("rechaza cantidades superiores al stock", () => expect(evaluateCompatibility(snapshot({ availableStock: 2, requestedQuantity: 3 }))).toEqual({ ok: false, code: "INSUFFICIENT_STOCK" }));
});

describe("integridad administrativa y del carrito", () => {
  const variant = { sku: "SKU-1", color: "Negro", price: 100, quantity: 5, deviceIds: [iphone15Pro], brandIds: [], requiredCapabilities: [] };
  it("rechaza relaciones de dispositivos duplicadas", () => expect(variantAdminSchema.safeParse({ ...variant, deviceIds: [iphone15Pro, iphone15Pro] }).success).toBe(false));
  it("rechaza relaciones de marcas duplicadas", () => expect(variantAdminSchema.safeParse({ ...variant, deviceIds: [], brandIds: [apple, apple] }).success).toBe(false));
  it("rechaza SKU duplicados dentro de una creación", () => {
    const result=productCreateSchema.safeParse({name:"Case",slug:"case",description:"Case",productType:"CASE",compatibilityMode:"DEVICE_SPECIFIC",variants:[variant,{...variant}]});
    expect(result.success).toBe(false);
  });
  it("rechaza precios negativos", () => expect(variantAdminSchema.safeParse({ ...variant, price: -1 }).success).toBe(false));
  it("rechaza inventario negativo", () => expect(variantAdminSchema.safeParse({ ...variant, quantity: -1 }).success).toBe(false));
  it("rechaza una reserva superior al inventario físico", () => expect(variantAdminSchema.safeParse({ ...variant, reservedQuantity: 6 }).success).toBe(false));
  it("rechaza el precio enviado por el navegador", () => {
    expect(cartItemInputSchema.safeParse({ productVariantId: iphone15Pro, deviceId: iphone15ProMax, quantity: 1, price: 1 }).success).toBe(false);
  });
});

describe("productos reales y de demostración", () => {
  const products=[{id:"demo",isDemo:true},{id:"real",isDemo:false}];
  it("puede excluir productos demo", () => expect(includeDemoProducts(products,false)).toEqual([{id:"real",isDemo:false}]));
  it("ordena productos reales antes de los demo", () => expect(realProductsFirst(products).map(product=>product.id)).toEqual(["real","demo"]));
});
