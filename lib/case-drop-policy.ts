import type { Product } from './catalog';

/** Use only unique, authorized catalog image references for CASE DROP. */
export function caseDropProducts(products: Product[], limit = 6): Product[] {
  const seen = new Set<string>();
  return products.filter(product => {
    if (product.isDemo || product.productType !== 'CASE' || !product.image || seen.has(product.image)) return false;
    seen.add(product.image);
    return true;
  }).slice(0, limit);
}
