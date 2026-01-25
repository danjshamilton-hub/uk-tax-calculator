// Compound Growth Utilities

/**
 * Calculate Future Value of regular contributions with compound growth
 * FV = PMT × [(1+r)^n - 1] / r
 *
 * @param payment - Regular payment amount (annual)
 * @param rate - Annual growth rate (as decimal, e.g., 0.05 for 5%)
 * @param years - Number of years
 */
export function calculateFutureValue(payment: number, rate: number, years: number): number {
  if (rate === 0) {
    return payment * years;
  }

  const r = rate / 100; // Convert percentage to decimal
  const fv = payment * ((Math.pow(1 + r, years) - 1) / r);

  return Math.round(fv * 100) / 100;
}
