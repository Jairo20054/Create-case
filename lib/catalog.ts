export type CatalogDevice = {
    id: string;
    name: string;
    slug: string;
    modelCode?: string;
    brand: {
        id: string;
        name: string;
        slug: string;
    };
    capabilities: string[];
};
export type ProductMedia = {
    id: string;
    url: string;
    alt: string;
    variantId?: string;
    type: "IMAGE" | "VIDEO";
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
    createdAt?: string;
    isFeatured?: boolean;
    images?: ProductMedia[];
    reviews?: {
        id: string;
        rating: number;
        comment: string;
    }[];
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
export type CatalogResponse = {
    products: Product[];
    devices: CatalogDevice[];
};
export const money = (value: number) => new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
}).format(value);
