import { cartTotals } from './pricing.mjs';

export function receipt(items, discountBps = 0) {
  const { subtotalCents, totalCents } = cartTotals(items, discountBps);
  return { subtotalCents, totalCents };
}
