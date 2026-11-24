export function cartTotals(items, discountBps = 0) {
  const subtotalCents = items.reduce((total, item) => total + item.unitCents * item.quantity, 0);
  const discountCents = items.reduce((total, item) =>
    total + Math.round(item.unitCents * item.quantity * discountBps / 10_000), 0);
  return { subtotalCents, discountCents, totalCents: subtotalCents - discountCents };
}
