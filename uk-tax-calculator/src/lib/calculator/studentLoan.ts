// Student Loan Repayment Calculator
//
// Repayments are collected through PAYE on the same pay basis as NI:
// pay after salary sacrifice (pension, car), including bonus and cash car
// allowance, but excluding benefits in kind.

import { studentLoanPlans, postgradLoanConfig } from '../../data/studentLoanRates2025';
import type { StudentLoanPlan } from '../../data/studentLoanRates2025';

/**
 * Annual undergraduate loan repayment for the given plan
 */
export function calculateStudentLoanRepayment(
  repaymentIncome: number,
  plan: StudentLoanPlan
): number {
  if (plan === 'none') return 0;
  const { threshold, rate } = studentLoanPlans[plan];
  const excess = Math.max(0, repaymentIncome - threshold);
  return Math.round(excess * (rate / 100) * 100) / 100;
}

/**
 * Annual postgraduate loan repayment (repaid concurrently with any plan)
 */
export function calculatePostgradLoanRepayment(
  repaymentIncome: number,
  hasPostgradLoan: boolean
): number {
  if (!hasPostgradLoan) return 0;
  const { threshold, rate } = postgradLoanConfig;
  const excess = Math.max(0, repaymentIncome - threshold);
  return Math.round(excess * (rate / 100) * 100) / 100;
}

/**
 * Combined marginal student loan rate on the next £1 of pay
 */
export function getMarginalStudentLoanRate(
  repaymentIncome: number,
  plan: StudentLoanPlan,
  hasPostgradLoan: boolean
): number {
  let rate = 0;
  if (plan !== 'none' && repaymentIncome > studentLoanPlans[plan].threshold) {
    rate += studentLoanPlans[plan].rate;
  }
  if (hasPostgradLoan && repaymentIncome > postgradLoanConfig.threshold) {
    rate += postgradLoanConfig.rate;
  }
  return rate;
}
