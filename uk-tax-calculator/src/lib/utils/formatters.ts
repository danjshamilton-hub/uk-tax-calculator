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
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers in compact form (e.g., "£342k")
 */
export function formatCompactCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `£${(amount / 1000000).toFixed(2)}m`;
  }
  if (amount >= 1000) {
    return `£${(amount / 1000).toFixed(0)}k`;
  }
  return formatCurrency(amount);
}
