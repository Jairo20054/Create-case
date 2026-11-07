export const orderTransitions: Record<string, readonly string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function canChangeOrderStatus(from: string, to: string): boolean {
  return from === to || Boolean(orderTransitions[from]?.includes(to));
}

export function reservationShouldBeReleased(from: string, to: string): boolean {
  return from !== to && (to === 'cancelled' || to === 'shipped');
}
