// Pension Calculator with Compound Growth

import { calculateFutureValue } from '../utils/compoundGrowth';
import { constants } from '../../data/constants';

/**
 * Calculate employee pension contribution
 * CRITICAL: Calculated on FULL gross salary BEFORE car salary sacrifice
 */
export function calculateEmployeePension(grossSalary: number, percentage: number): number {
  return Math.round((grossSalary * (percentage / 100)) * 100) / 100;
}

/**
 * Calculate employer pension contribution
 * CRITICAL: Calculated on FULL gross salary BEFORE car salary sacrifice
 */
export function calculateEmployerPension(grossSalary: number, percentage: number): number {
  return Math.round((grossSalary * (percentage / 100)) * 100) / 100;
}

/**
 * Calculate total pension pot after specified years
 */
export function calculatePensionPot(
  employeeContribution: number,
  employerContribution: number,
  years: number,
  growthRate: number = constants.defaultInvestmentReturn
): number {
  const totalAnnualContribution = employeeContribution + employerContribution;
  return calculateFutureValue(totalAnnualContribution, growthRate, years);
}

/**
 * Calculate pension pot at retirement
 */
export function calculatePensionAtRetirement(
  employeeContribution: number,
  employerContribution: number,
  currentAge: number,
  retirementAge: number,
  growthRate: number = constants.defaultInvestmentReturn
): number {
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  return calculatePensionPot(employeeContribution, employerContribution, yearsToRetirement, growthRate);
}
