import { describe, expect, it } from 'vitest';
import type { Product } from '../lib/catalog';
import { caseDropProducts } from '../lib/case-drop-policy';
import { canChangeOrderStatus, reservationShouldBeReleased } from '../lib/commerce/order-status';

const base = { id: 'case-a', productType: 'CASE', isDemo: false, image: 'https://photos.example/a.webp' } as Product;
describe('CASE DROP', () => {
  it('uses real CASE catalog images and excludes demos and accessories', () => {
    const result = caseDropProducts([
      { ...base, id: 'demo', isDemo: true },
      { ...base, id: 'charger', productType: 'CHARGER', image: 'https://photos.example/c.webp' },
      base,
    ]);
    expect(result.map(p => p.id)).toEqual(['case-a']);
  });
  it('shows no fabricated cases when catalog is empty', () => {
    expect(caseDropProducts([])).toEqual([]);
  });
  it('deduplicates same image and respects visible case limit', () => {
    const result = caseDropProducts([
      base, { ...base, id: 'duplicate' },
      ...Array.from({ length: 8 }, (_, index) => ({ ...base, id: 'x' + index, image: 'https://photos.example/' + index })),
    ]);
    expect(result).toHaveLength(6);
    expect(result[0].id).toBe('case-a');
  });
});
describe('administrative order transitions', () => {
  it('allows pending orders to be confirmed or cancelled', () => {
    expect(canChangeOrderStatus('pending', 'confirmed')).toBe(true);
    expect(canChangeOrderStatus('pending', 'cancelled')).toBe(true);
  });
  it('prevents unsafe status jumps and reverting fulfilled orders', () => {
    expect(canChangeOrderStatus('pending', 'delivered')).toBe(false);
    expect(canChangeOrderStatus('delivered', 'pending')).toBe(false);
  });
  it('releases stock once when cancelled or dispatched, not when revisiting same status', () => {
    expect(reservationShouldBeReleased('pending', 'cancelled')).toBe(true);
    expect(reservationShouldBeReleased('preparing', 'shipped')).toBe(true);
    expect(reservationShouldBeReleased('cancelled', 'cancelled')).toBe(false);
    expect(reservationShouldBeReleased('shipped', 'delivered')).toBe(false);
  });
});
