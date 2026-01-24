// National Insurance Calculator

import { nationalInsuranceBands } from '../../data/niRates2025';

/**
 * Calculate National Insurance contributions
 * Applied to gross income after pension and car salary sacrifice deductions
 */
export function calculateNationalInsurance(grossIncome: number): number {
  let totalNI = 0;
  let previousBandMax = 0;

  for (const band of nationalInsuranceBands) {
    if (grossIncome <= previousBandMax) break;
    if (band.rate === 0) {
      previousBandMax = band.max || 0;
      continue;
    }

    const bandStart = band.min;
    const bandEnd = band.max === null ? grossIncome : Math.min(band.max, grossIncome);
    const incomeInBand = Math.max(0, bandEnd - Math.max(bandStart, previousBandMax));

    if (incomeInBand > 0) {
      const niInBand = incomeInBand * (band.rate / 100);
      totalNI += niInBand;
    }

    previousBandMax = band.max || grossIncome;
  }

  return Math.round(totalNI * 100) / 100;
}
