import type { CatalogDevice, CatalogVariant, Product } from './catalog';
export function isCompatible(product: Product, variant: CatalogVariant, device?: CatalogDevice) {
    if (!device)
        return true;
    const physical = product.compatibilityMode === 'UNIVERSAL' ||
        (product.compatibilityMode === 'DEVICE_SPECIFIC' && variant.compatibleDeviceIds.includes(device.id)) ||
        (product.compatibilityMode === 'BRAND_SPECIFIC' && variant.compatibleBrandIds.includes(device.brand.id));
    return physical && variant.requiredCapabilities.every(code => device.capabilities.includes(code));
}
export const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const colorValue = (color: string): string | undefined => {
    if (/^#[0-9a-f]{6}$/i.test(color))
        return color;
    return ({ negro: '#171717', black: '#171717', plata: '#b1b3b5', silver: '#b1b3b5', blanco: '#ffffff', white: '#ffffff', terracota: '#a85f46', arena: '#d9ccb8', oliva: '#68705a', grafito: '#4a4c4a', marfil: '#eee9df', transparente: '#e9e9e0', humo: '#777a77', cafe: '#684c3b', 'rosa humo': '#b78e8b', verde: '#45674d', azul: '#315b89', rojo: '#a83737' } as Record<string, string>)[normalize(color)];
};
export type ShopFilters = {
    q: string;
    device: string;
    category: string;
    color: string;
    technology: string;
    material: string;
    collection: string;
    min: string;
    max: string;
    stock: string;
    sort: string;
    offers: string;
};
export const emptyFilters: ShopFilters = { q: '', device: '', category: '', color: '', technology: '', material: '', collection: '', min: '', max: '', stock: '', sort: 'recommended', offers: '' };
export function filterProducts(products: Product[], devices: CatalogDevice[], filters: ShopFilters) {
    const device = devices.find(d => d.id === filters.device || d.slug === filters.device);
    if (filters.device && !device)
        return [];
    const result = products.flatMap(product => {
        if (filters.category && filters.category !== product.category && filters.category !== product.productType)
            return [];
        if (filters.technology && !product.features.includes(filters.technology))
            return [];
        if (filters.collection && product.collection !== filters.collection)
            return [];
        const variants = product.variants.filter(variant => isCompatible(product, variant, device) &&
            (!filters.color || variant.color === filters.color) && (!filters.material || variant.material === filters.material) &&
            (!filters.stock || variant.availableStock > 0) &&
            (!filters.min || variant.price >= Number(filters.min)) && (!filters.max || variant.price <= Number(filters.max)) &&
            (!filters.offers || (variant.compareAtPrice ?? 0) > variant.price));
        if (!variants.length)
            return [];
        const searchText = normalize([product.name, product.description, product.collection, ...product.features, ...product.models, ...devices.filter(d => variants.some(v => isCompatible(product, v, d))).map(d => d.brand.name), ...variants.map(v => [v.color, v.sku, v.material].join(' '))].join(' '));
        if (!normalize(filters.q).split(/\s+/).every(word => searchText.includes(word)))
            return [];
        return [{ ...product, variants, price: Math.min(...variants.map(v => v.price)), stock: variants.reduce((s, v) => s + v.availableStock, 0) }];
    });
    return result.sort((a, b) => Number(a.isDemo) - Number(b.isDemo) || (filters.sort === 'price-asc' ? a.price - b.price : filters.sort === 'price-desc' ? b.price - a.price : filters.sort === 'newest' ? (b.createdAt ?? '').localeCompare(a.createdAt ?? '') : Number(b.isFeatured) - Number(a.isFeatured)));
}
export const productHref = (product: Product, variant?: CatalogVariant, device?: CatalogDevice) => {
    const query = new URLSearchParams();
    if (variant)
        query.set('variant', variant.id);
    if (device)
        query.set('device', device.slug);
    return `/product/${product.slug}${query.size ? '?' + query.toString() : ''}`;
};
