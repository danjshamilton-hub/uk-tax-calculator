// Income Tax Calculator with Personal Allowance Taper

import { getTaxConfig } from '../../data/taxRates2025';
import type { TaxRegion } from '../../data/taxRates2025';

/**
 * Calculate Personal Allowance with taper
 * PA reduces by £1 for every £2 earned over £100,000
 * Fully tapered out at £125,140
 */
export function calculatePersonalAllowance(income: number): number {
  const config = getTaxConfig('england'); // PA is same for both regions
  const { personalAllowance, personalAllowanceTaperStart, personalAllowanceTaperEnd } = config;

  if (income <= personalAllowanceTaperStart) {
    return personalAllowance;
  }

  if (income >= personalAllowanceTaperEnd) {
    return 0;
  }

  // Taper: lose £1 for every £2 over £100k
  const excessIncome = income - personalAllowanceTaperStart;
  const taperReduction = excessIncome / 2;
  const adjustedPA = personalAllowance - taperReduction;

  return Math.max(0, adjustedPA);
}

/**
 * Calculate income tax for a given taxable income and region
 */
export function calculateIncomeTax(taxableIncome: number, region: TaxRegion): number {
  const config = getTaxConfig(region);
  const personalAllowance = calculatePersonalAllowance(taxableIncome);

  // Income subject to tax (after personal allowance)
  const taxableAfterPA = Math.max(0, taxableIncome - personalAllowance);

  let totalTax = 0;
  let remainingIncome = taxableAfterPA;

  // Apply tax bands
  for (const band of config.bands) {
    if (band.rate === 0) continue; // Skip 0% bands (PA already applied)
    if (remainingIncome <= 0) break;

    const bandStart = Math.max(0, band.min - personalAllowance);
    const bandEnd = band.max === null ? Infinity : band.max - personalAllowance;
    const bandWidth = bandEnd - bandStart;

    // Calculate income in this band
    const incomeInBand = Math.min(remainingIncome, bandWidth);

    if (incomeInBand > 0) {
      const taxInBand = incomeInBand * (band.rate / 100);
      totalTax += taxInBand;
      remainingIncome -= incomeInBand;
    }
  }

  return Math.round(totalTax * 100) / 100; // Round to 2 decimal places
}
