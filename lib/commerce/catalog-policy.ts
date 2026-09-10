export function includeDemoProducts<T extends { isDemo: boolean }>(products: T[], includeDemo: boolean): T[] {
  return includeDemo ? products : products.filter((product) => !product.isDemo);
}

export function realProductsFirst<T extends { isDemo: boolean }>(products: T[]): T[] {
  return [...products].sort((left, right) => Number(left.isDemo) - Number(right.isDemo));
}
