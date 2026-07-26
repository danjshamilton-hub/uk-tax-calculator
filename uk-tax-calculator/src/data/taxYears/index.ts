// Tax year registry.
//
// A UK tax year is identified by its start year: 2026 means 2026/27 (6 April
// 2026 to 5 April 2027). Parental leave routinely spans two tax years, so rates
// are looked up per year rather than baked in as a single frozen set.

import type { TaxYearRates, TaxRegion, TaxConfig, StudentLoanPlan } from './types';
import { taxYear2025 } from './year2025';
import { taxYear2026 } from './year2026';

export type {
  TaxBand,
  TaxConfig,
  NIBand,
  TaxRegion,
  StudentLoanPlan,
  StudentLoanConfig,
  BenefitsThresholds,
  StatutoryPayConfig,
  TaxYearRates,
} from './types';

/** The tax year the app calculates in by default */
export const DEFAULT_TAX_YEAR = 2026;

/**
 * 2027/28 rates have not been announced (Autumn Budget 2026 has not happened).
 * Carry 2026/27 forward so that leave running into 2027/28 still calculates,
 * flagged so the UI can label the figures as projected rather than published.
 */
const taxYear2027: TaxYearRates = {
  ...structuredClone(taxYear2026),
  taxYear: 2027,
  isProjected: true,
};

export const taxYears: Record<number, TaxYearRates> = {
  2025: taxYear2025,
  2026: taxYear2026,
  2027: taxYear2027,
};

const knownYears = Object.keys(taxYears)
  .map(Number)
  .sort((a, b) => a - b);

const earliestYear = knownYears[0];
const latestYear = knownYears[knownYears.length - 1];

/**
 * Rates for a tax year. Years outside the registry clamp to the nearest known
 * year and are always reported as projected.
 */
export function getRatesForTaxYear(year: number = DEFAULT_TAX_YEAR): TaxYearRates {
  const exact = taxYears[year];
  if (exact) return exact;

  const nearest = year < earliestYear ? taxYears[earliestYear] : taxYears[latestYear];
  return { ...structuredClone(nearest), taxYear: year, isProjected: true };
}

/** Income tax bands and personal allowance for a region in a given tax year */
export function getTaxConfig(region: TaxRegion, taxYear: number = DEFAULT_TAX_YEAR): TaxConfig {
  const rates = getRatesForTaxYear(taxYear);
  return region === 'scotland' ? rates.scotland : rates.england;
}

export function getNIBands(taxYear: number = DEFAULT_TAX_YEAR) {
  return getRatesForTaxYear(taxYear).nationalInsuranceBands;
}

export function getStudentLoanPlans(taxYear: number = DEFAULT_TAX_YEAR) {
  return getRatesForTaxYear(taxYear).studentLoanPlans;
}

export function getPostgradLoanConfig(taxYear: number = DEFAULT_TAX_YEAR) {
  return getRatesForTaxYear(taxYear).postgradLoanConfig;
}

export function getBenefitsThresholds(taxYear: number = DEFAULT_TAX_YEAR) {
  return getRatesForTaxYear(taxYear).benefitsThresholds;
}

export function getStatutoryPay(taxYear: number = DEFAULT_TAX_YEAR) {
  return getRatesForTaxYear(taxYear).statutoryPay;
}

/** Standard weekly rate for SMP (weeks 7-39), SPP and ShPP in a given tax year */
export function statutoryWeeklyRate(taxYear: number = DEFAULT_TAX_YEAR): number {
  return getRatesForTaxYear(taxYear).statutoryPay.weeklyRate;
}

/** Format a tax year start year as "2026/27" */
export function formatTaxYear(startYear: number): string {
  return `${startYear}/${(startYear + 1).toString().slice(-2)}`;
}

/** Labels for student loan plan options, for use in dropdowns */
export function getStudentLoanPlanLabel(
  plan: Exclude<StudentLoanPlan, 'none'>,
  taxYear: number = DEFAULT_TAX_YEAR
): string {
  return getStudentLoanPlans(taxYear)[plan].label;
}
