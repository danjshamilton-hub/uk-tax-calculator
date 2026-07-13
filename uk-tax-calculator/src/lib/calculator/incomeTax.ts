// Income Tax Calculator with Personal Allowance Taper

import { getTaxConfig } from '../../data/taxRates2025';
import type { TaxRegion } from '../../data/taxRates2025';

export interface TaxBracketBreakdown {
  bandName: string;
  min: number;
  max: number | null;
  rate: number;
  incomeInBand: number;
  taxInBand: number;
}

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

    // Bands are inclusive [min, max], so the band actually spans (min - 1, max]
    const bandStart = Math.max(0, band.min - 1 - personalAllowance);
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

/**
 * Get tax breakdown by bracket for display purposes
 */
export function getTaxBreakdown(taxableIncome: number, region: TaxRegion): TaxBracketBreakdown[] {
  const config = getTaxConfig(region);
  const personalAllowance = calculatePersonalAllowance(taxableIncome);
  const taxableAfterPA = Math.max(0, taxableIncome - personalAllowance);

  const breakdown: TaxBracketBreakdown[] = [];
  let remainingIncome = taxableAfterPA;

  const bandNames: Record<string, Record<number, string>> = {
    england: {
      0: 'Personal Allowance',
      20: 'Basic Rate',
      40: 'Higher Rate',
      45: 'Additional Rate',
    },
    scotland: {
      0: 'Personal Allowance',
      19: 'Starter Rate',
      20: 'Basic Rate',
      21: 'Intermediate Rate',
      42: 'Higher Rate',
      45: 'Advanced Rate',
      48: 'Top Rate',
    },
  };

  for (const band of config.bands) {
    const bandStart = band.min;
    const bandEnd = band.max;

    if (band.rate === 0) {
      // Personal allowance band
      breakdown.push({
        bandName: bandNames[region][band.rate] || `${band.rate}%`,
        min: bandStart,
        max: bandEnd,
        rate: band.rate,
        incomeInBand: personalAllowance,
        taxInBand: 0,
      });
      continue;
    }

    if (remainingIncome <= 0) {
      breakdown.push({
        bandName: bandNames[region][band.rate] || `${band.rate}%`,
        min: bandStart,
        max: bandEnd,
        rate: band.rate,
        incomeInBand: 0,
        taxInBand: 0,
      });
      continue;
    }

    const adjustedBandStart = Math.max(0, band.min - 1 - personalAllowance);
    const adjustedBandEnd = band.max === null ? Infinity : band.max - personalAllowance;
    const bandWidth = adjustedBandEnd - adjustedBandStart;

    const incomeInBand = Math.min(remainingIncome, bandWidth);
    const taxInBand = incomeInBand * (band.rate / 100);

    breakdown.push({
      bandName: bandNames[region][band.rate] || `${band.rate}%`,
      min: bandStart,
      max: bandEnd,
      rate: band.rate,
      incomeInBand: Math.round(incomeInBand * 100) / 100,
      taxInBand: Math.round(taxInBand * 100) / 100,
    });

    remainingIncome -= incomeInBand;
  }

  return breakdown;
}
