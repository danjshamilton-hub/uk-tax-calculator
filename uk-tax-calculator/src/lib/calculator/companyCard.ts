// Company Car BIK (Benefit in Kind) Calculator

/**
 * Calculate BIK taxable amount
 * BIK = P11D Value × BIK %
 */
export function calculateBIKTaxableAmount(p11dValue: number, bikPercentage: number): number {
  return Math.round(p11dValue * (bikPercentage / 100) * 100) / 100;
}

/**
 * Calculate BIK tax at marginal rate
 * This is simplified - in reality, BIK is taxed at your marginal rate
 * For now, we calculate the tax amount based on the taxable income
 */
export function calculateBIKTax(bikTaxableAmount: number, marginalTaxRate: number): number {
  return Math.round(bikTaxableAmount * (marginalTaxRate / 100) * 100) / 100;
}
