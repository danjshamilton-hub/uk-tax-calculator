// LBTT (Scotland) Calculator

import { lbttBands } from '../../data/lbttRates2025';

/**
 * Calculate Land and Buildings Transaction Tax (Scotland)
 * Applied in bands similar to income tax
 */
export function calculateLBTT(purchasePrice: number): number {
  let totalTax = 0;
  let previousBandMax = 0;

  for (const band of lbttBands) {
    if (purchasePrice <= previousBandMax) break;

    const bandStart = band.min;
    const bandEnd = band.max === null ? purchasePrice : Math.min(band.max, purchasePrice);
    const amountInBand = Math.max(0, bandEnd - bandStart);

    if (amountInBand > 0) {
      const taxInBand = amountInBand * (band.rate / 100);
      totalTax += taxInBand;
    }

    previousBandMax = band.max || purchasePrice;
  }

  return Math.round(totalTax * 100) / 100;
}
