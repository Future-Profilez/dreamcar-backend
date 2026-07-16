const getCompetitionTicketDiscountPercent = (totalTickets) => {
  const qty = Number(totalTickets);
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  if (qty >= 50) return 0.2;
  if (qty >= 25) return 0.15;
  if (qty >= 10) return 0.1;
  return 0;
};

const allocateTicketDiscountCents = (subtotalsCents, discountPercent) => {
  const percent = Number(discountPercent);
  if (!Array.isArray(subtotalsCents) || subtotalsCents.length === 0) return [];
  if (!Number.isFinite(percent) || percent <= 0) return subtotalsCents.map(() => 0);

  const safeSubtotals = subtotalsCents.map((v) => Math.max(0, Number(v) || 0));
  const totalDiscount = Math.round(
    safeSubtotals.reduce((sum, v) => sum + v, 0) * percent
  );

  let remaining = totalDiscount;
  const discounts = safeSubtotals.map((subtotal, idx) => {
    if (idx === safeSubtotals.length - 1) {
      const last = Math.max(0, Math.min(subtotal, remaining));
      remaining -= last;
      return last;
    }
    const d = Math.floor(subtotal * percent);
    const bounded = Math.max(0, Math.min(subtotal, d));
    remaining -= bounded;
    return bounded;
  });

  return discounts;
};

module.exports = {
  getCompetitionTicketDiscountPercent,
  allocateTicketDiscountCents,
};
