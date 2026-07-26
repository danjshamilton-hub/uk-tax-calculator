// Student Loan Repayment Calculator
//
// Repayments are collected through PAYE on the same pay basis as NI:
// pay after salary sacrifice (pension, car), including bonus and cash car
// allowance, but excluding benefits in kind.

import {
  getStudentLoanPlans,
  getPostgradLoanConfig,
  DEFAULT_TAX_YEAR,
} from '../../data/taxYears';
import type { StudentLoanPlan } from '../../data/taxYears';

/**
 * Annual undergraduate loan repayment for the given plan
 */
export function calculateStudentLoanRepayment(
  repaymentIncome: number,
  plan: StudentLoanPlan,
  taxYear: number = DEFAULT_TAX_YEAR
): number {
  if (plan === 'none') return 0;
  const { threshold, rate } = getStudentLoanPlans(taxYear)[plan];
  const excess = Math.max(0, repaymentIncome - threshold);
  return Math.round(excess * (rate / 100) * 100) / 100;
}

/**
 * Undergraduate loan repayment for a single pay period.
 * Like NI, student loan deductions are assessed per pay period rather than
 * cumulatively, so uneven pay through the year must be calculated period by
 * period.
 */
export function calculateStudentLoanForPeriod(
  periodPay: number,
  plan: StudentLoanPlan,
  periodsPerYear: number = 12,
  taxYear: number = DEFAULT_TAX_YEAR
): number {
  if (plan === 'none') return 0;
  const { threshold, rate } = getStudentLoanPlans(taxYear)[plan];
  const excess = Math.max(0, periodPay - threshold / periodsPerYear);
  return Math.round(excess * (rate / 100) * 100) / 100;
}

/**
 * Annual postgraduate loan repayment (repaid concurrently with any plan)
 */
export function calculatePostgradLoanRepayment(
  repaymentIncome: number,
  hasPostgradLoan: boolean,
  taxYear: number = DEFAULT_TAX_YEAR
): number {
  if (!hasPostgradLoan) return 0;
  const { threshold, rate } = getPostgradLoanConfig(taxYear);
  const excess = Math.max(0, repaymentIncome - threshold);
  return Math.round(excess * (rate / 100) * 100) / 100;
}

/**
 * Postgraduate loan repayment for a single pay period
 */
export function calculatePostgradLoanForPeriod(
  periodPay: number,
  hasPostgradLoan: boolean,
  periodsPerYear: number = 12,
  taxYear: number = DEFAULT_TAX_YEAR
): number {
  if (!hasPostgradLoan) return 0;
  const { threshold, rate } = getPostgradLoanConfig(taxYear);
  const excess = Math.max(0, periodPay - threshold / periodsPerYear);
  return Math.round(excess * (rate / 100) * 100) / 100;
}

/**
 * Combined marginal student loan rate on the next £1 of pay
 */
export function getMarginalStudentLoanRate(
  repaymentIncome: number,
  plan: StudentLoanPlan,
  hasPostgradLoan: boolean,
  taxYear: number = DEFAULT_TAX_YEAR
): number {
  const plans = getStudentLoanPlans(taxYear);
  const postgrad = getPostgradLoanConfig(taxYear);

  let rate = 0;
  if (plan !== 'none' && repaymentIncome > plans[plan].threshold) {
    rate += plans[plan].rate;
  }
  if (hasPostgradLoan && repaymentIncome > postgrad.threshold) {
    rate += postgrad.rate;
  }
  return rate;
}
