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

/**
 * Safely parse a numeric input value, returning a fallback if the result is NaN.
 * Prevents NaN from propagating through calculations.
 */
export function safeNumber(value: string | number, fallback: number = 0): number {
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? fallback : parsed;
}
