export type CatalogDevice = {
  id: string;
  name: string;
  slug: string;
  modelCode?: string;
  brand: { id: string; name: string; slug: string };
  capabilities: string[];
};

export type CatalogVariant = {
  id: string;
  sku: string;
  name?: string;
  color: string;
  design?: string;
  material?: string;
  price: number;
  compareAtPrice?: number;
  imageUrl?: string;
  availableStock: number;
  compatibleDeviceIds: string[];
  compatibleBrandIds: string[];
  requiredCapabilities: string[];
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  collection: string;
  price: number;
  comparePrice?: number;
  tag?: string;
  color: string;
  colors: string[];
  models: string[];
  design: string;
  image: string;
  alt: string;
  category: "CASES" | "SMART" | "ACCESSORIES";
  productType: string;
  compatibilityMode: "UNIVERSAL" | "BRAND_SPECIFIC" | "DEVICE_SPECIFIC";
  isDemo: boolean;
  stock: number;
  description: string;
  features: string[];
  variants: CatalogVariant[];
};

export type CatalogResponse = { products: Product[]; devices: CatalogDevice[] };

export const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export const drops = [
  { slug: "atelier-01", number: "001", name: "ATELIER 01", line: "Metal, reflejo y forma.", date: "2026-09-18", image: "https://images.unsplash.com/photo-1601593346740-925612772716?auto=format&fit=crop&w=1400&q=88" },
  { slug: "tierra", number: "002", name: "TIERRA", line: "Color sereno. Tacto real.", date: "2026-10-04", image: "https://images.unsplash.com/photo-1603899122634-f086ca5f5ddd?auto=format&fit=crop&w=1400&q=88" },
];
