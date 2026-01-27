// Formatting Utilities

/**
 * Format currency with £ symbol and thousands separators
 */
export function formatCurrency(amount: number, decimals: number = 0): string {
  return `£${amount.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
