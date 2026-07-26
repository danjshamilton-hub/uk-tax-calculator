// National Insurance Calculator

import { getNIBands, DEFAULT_TAX_YEAR } from '../../data/taxYears';

/**
 * Calculate National Insurance contributions on an annual basis.
 * Applied to gross income after pension and car salary sacrifice deductions.
 */
export function calculateNationalInsurance(
  grossIncome: number,
  taxYear: number = DEFAULT_TAX_YEAR
): number {
  return calculateNIForPeriod(grossIncome, 1, taxYear);
}

/**
 * Calculate National Insurance for a single pay period.
 *
 * NI is assessed separately on each pay period and, unlike PAYE income tax, is
 * not cumulative across the year: a month of low pay does not refund NI paid in
 * an earlier month. Annualising a year that contains months of statutory-only
 * pay therefore understates the NI actually due, so anything modelling uneven
 * pay through the year (parental leave, for instance) must use this function.
 *
 * @param periodPay - gross pay for the period, after salary sacrifice
 * @param periodsPerYear - 12 for monthly, 52 for weekly, 1 for annual
 */
export function calculateNIForPeriod(
  periodPay: number,
  periodsPerYear: number = 12,
  taxYear: number = DEFAULT_TAX_YEAR
): number {
  const bands = getNIBands(taxYear);

  let totalNI = 0;
  let previousBandMax = 0; // annual basis, scaled per band below

  for (const band of bands) {
    const previousMax = previousBandMax / periodsPerYear;
    if (periodPay <= previousMax) break;

    if (band.rate === 0) {
      previousBandMax = band.max || 0;
      continue;
    }

    // Scale the annual thresholds down to this pay period
    const bandStart = band.min / periodsPerYear;
    const bandEnd =
      band.max === null ? periodPay : Math.min(band.max / periodsPerYear, periodPay);
    const payInBand = Math.max(0, bandEnd - Math.max(bandStart, previousMax));

    if (payInBand > 0) {
      totalNI += payInBand * (band.rate / 100);
    }

    previousBandMax = band.max || periodPay * periodsPerYear;
  }

  return Math.round(totalNI * 100) / 100;
}
