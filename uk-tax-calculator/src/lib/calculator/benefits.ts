// Benefits Calculator (Child Benefit, Tax-Free Childcare, 30 Hours Free Childcare)

import { benefitsThresholds } from '../../data/benefitsThresholds2025';
import type { TaxRegion } from '../../data/taxRates2025';

/**
 * Calculate Adjusted Net Income (ANI) for benefits means-testing
 * CRITICAL: ANI = Gross - Pension - Car Sacrifice + BIK Value (not BIK tax)
 */
export function calculateAdjustedNetIncome(
  grossSalary: number,
  employeePension: number,
  carSalarySacrifice: number,
  bikTaxableAmount: number
): number {
  return grossSalary - employeePension - carSalarySacrifice + bikTaxableAmount;
}

/**
 * Calculate High Income Child Benefit Charge
 * Tapers from £60k to £80k (1% per £200 over £60k)
 */
export function calculateChildBenefitCharge(
  adjustedNetIncome: number,
  hasChildren: boolean,
  numberOfChildren: number
): number {
  if (!hasChildren || numberOfChildren === 0) return 0;

  const { taperStart, taperEnd, annualBenefitFirstChild, annualBenefitAdditionalChild } =
    benefitsThresholds.childBenefit;

  if (adjustedNetIncome <= taperStart) return 0;

  // Calculate annual child benefit
  const totalChildBenefit =
    annualBenefitFirstChild + (numberOfChildren - 1) * annualBenefitAdditionalChild;

  if (adjustedNetIncome >= taperEnd) {
    return totalChildBenefit; // 100% charge
  }

  // Taper: 1% per £200 over £60k
  const excessIncome = adjustedNetIncome - taperStart;
  const chargePercentage = (excessIncome / 200) * 1;
  const charge = totalChildBenefit * (chargePercentage / 100);

  return Math.round(charge * 100) / 100;
}

/**
 * Calculate Tax-Free Childcare loss
 * Loses £2k per child if ANI exceeds £100k
 */
export function calculateTaxFreeChildcareLoss(
  adjustedNetIncome: number,
  hasChildren: boolean,
  numberOfChildren: number
): number {
  if (!hasChildren || numberOfChildren === 0) return 0;

  const { threshold, governmentContributionPerChild } = benefitsThresholds.taxFreeChildcare;

  if (adjustedNetIncome > threshold) {
    return governmentContributionPerChild * numberOfChildren;
  }

  return 0;
}

/**
 * Calculate 30 Hours Free Childcare loss (England only)
 * Loses eligibility if ANI exceeds £100k
 */
export function calculate30HoursFreeChildcareLoss(
  adjustedNetIncome: number,
  hasChildren: boolean,
  numberOfChildren: number,
  region: TaxRegion
): number {
  if (!hasChildren || numberOfChildren === 0) return 0;
  if (region !== 'england') return 0; // England only

  const { threshold } = benefitsThresholds.freeChildcare30Hours;

  // This is a qualitative loss - hard to quantify exact value
  // For now, return 0 but flag in warnings
  // Could estimate based on average childcare costs (e.g., £6k/year per child)
  if (adjustedNetIncome > threshold) {
    return 0; // Flagged in warnings instead
  }

  return 0;
}

/**
 * Calculate total benefits impact (charges and losses)
 */
export function calculateTotalBenefitsImpact(
  adjustedNetIncome: number,
  hasChildren: boolean,
  numberOfChildren: number,
  region: TaxRegion
): {
  childBenefitCharge: number;
  taxFreeChildcareLoss: number;
  freeChildcareLoss: number;
  totalImpact: number;
} {
  const childBenefitCharge = calculateChildBenefitCharge(
    adjustedNetIncome,
    hasChildren,
    numberOfChildren
  );
  const taxFreeChildcareLoss = calculateTaxFreeChildcareLoss(
    adjustedNetIncome,
    hasChildren,
    numberOfChildren
  );
  const freeChildcareLoss = calculate30HoursFreeChildcareLoss(
    adjustedNetIncome,
    hasChildren,
    numberOfChildren,
    region
  );

  return {
    childBenefitCharge,
    taxFreeChildcareLoss,
    freeChildcareLoss,
    totalImpact: childBenefitCharge + taxFreeChildcareLoss + freeChildcareLoss,
  };
}
