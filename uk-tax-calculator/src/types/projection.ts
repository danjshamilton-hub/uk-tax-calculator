// Multi-year projection type definitions

import type { TaxRegion } from '../data/taxYears';
import type { StudentLoanPlan } from '../data/taxYears';

// ============================================
// INPUT TYPES
// ============================================

/**
 * Company car configuration for a specific year
 * Supports month-level precision for start/end dates
 * Tax year months: 1=April, 2=May, ..., 9=December, 10=January, 11=February, 12=March
 */
export interface YearCompanyCarConfig {
  hasCompanyCar: boolean;
  carSalarySacrifice: number; // Monthly amount
  carP11DValue: number;
  carBIKPercentage: number; // BIK rate for this year (user-specified)

  // Month precision for pro-rata calculations
  startMonth: number; // 1-12, where 1=April (default: 1)
  endMonth: number; // 1-12, where 12=March (default: 12)
}

/**
 * Configuration for a single year within a projection (for one scenario)
 */
export interface YearScenarioConfig {
  // Salary - if set, overrides computed value from base + increase
  salaryOverride?: number;

  // Pension percentage for this year (overrides default)
  employeePensionPercentage: number;

  // Bonus for this year
  bonusAmount: number;
  bonusSacrificePercentage: number; // 0-100

  // Company car configuration for this year
  companyCar: YearCompanyCarConfig;

  // Children eligible for Tax-Free Childcare this year
  numberOfChildrenForChildcare: number;
}

/**
 * Configuration for a single year with both scenarios A and B
 */
export interface YearConfig {
  year: number; // 1, 2, 3... (relative year number)
  scenarioA: YearScenarioConfig;
  scenarioB: YearScenarioConfig;
}

/**
 * Main projection inputs
 */
export interface ProjectionInputs {
  // Tax region
  taxRegion: TaxRegion;

  // Projection period
  projectionYears: number; // 1-10
  startingTaxYear: number; // e.g., 2025 for 2025/26

  // Starting salary and default increase
  baseSalary: number;
  defaultAnnualSalaryIncrease: number; // Percentage, e.g., 3 for 3%

  // Default pension (used as starting point)
  defaultEmployeePensionPercentage: number;
  employerPensionPercentage: number;

  // Personal
  currentAge: number;
  retirementAge: number;

  // Student Loan (shared across scenarios and years)
  studentLoanPlan?: StudentLoanPlan;
  hasPostgradLoan?: boolean;

  // Starting pension pot (for accumulation calculations)
  existingPensionPot: number;

  // Per-year configurations with A/B scenarios
  yearConfigs: YearConfig[];
}

// ============================================
// OUTPUT TYPES
// ============================================

/**
 * Results for a single year within the projection
 */
export interface YearResult {
  year: number;
  taxYear: string; // e.g., "2025/26"

  // Income
  grossSalary: number;
  bonusAmount: number;
  bonusSacrificedToPension: number;
  totalGrossIncome: number;

  // Deductions
  employeePension: number;
  employerPension: number;
  carSalarySacrifice: number; // Full year amount
  carSalarySacrificeProRata: number; // Actual amount after pro-rata
  bikTaxableAmount: number; // Full year
  bikTaxableAmountProRata: number; // After pro-rata

  // Tax
  incomeTax: number;
  nationalInsurance: number;
  bikTax: number;
  childBenefitCharge: number;
  taxFreeChildcareBenefit: number;
  totalTaxPaid: number; // Sum of all taxes

  // Net
  annualTakeHome: number;
  monthlyTakeHome: number;
  adjustedNetIncome: number;

  // Rates used
  effectiveTaxRate: number;
  marginalTaxRate: number;
  combinedMarginalRate: number;
  employeePensionPercentage: number;

  // Pension accumulation (iterative)
  yearStartPensionPot: number;
  totalPensionContribution: number;
  pensionGrowth: number; // Growth on existing pot
  yearEndPensionPot: number;

  // Car details
  carMonthsActive: number; // 0-12
  carBIKPercentage: number; // Rate used this year
  carProRataFactor: number; // 0-1

  // Children for childcare
  numberOfChildrenForChildcare: number;

  // Cumulative totals (running sums up to and including this year)
  cumulativeTakeHome: number;
  cumulativeTaxPaid: number;
  cumulativePensionContributions: number;
}

/**
 * Complete projection results for one scenario
 */
export interface ProjectionResults {
  // Configuration
  scenarioName: string;
  projectionYears: number;
  startingTaxYear: number;

  // Year-by-year results
  yearResults: YearResult[];

  // Totals across all years
  totalTakeHome: number;
  totalTaxPaid: number;
  totalPensionContributions: number;
  finalPensionPot: number;

  // Averages
  averageAnnualTakeHome: number;
  averageEffectiveTaxRate: number;

  // Growth summary (first year vs last year)
  salaryGrowthPercent: number;
  takeHomeGrowthPercent: number;
  pensionPotGrowthAmount: number;
}

/**
 * Year-by-year difference between two scenarios
 */
export interface YearDifference {
  year: number;
  taxYear: string;
  takeHomeDiff: number; // B - A for this year
  pensionPotDiff: number; // B - A pension pot at end of year
  cumulativeTakeHomeDiff: number; // B - A cumulative
  cumulativePensionDiff: number; // B - A cumulative contributions
}

/**
 * Comparison between two projection scenarios
 */
export interface ProjectionComparison {
  scenarioA: ProjectionResults;
  scenarioB: ProjectionResults;

  // Total differences (B - A)
  totalTakeHomeDifference: number;
  totalTaxDifference: number;
  finalPensionPotDifference: number;

  // Year-by-year differences
  yearDifferences: YearDifference[];

  // Break-even analysis
  // Year when pension advantage covers cumulative take-home loss (if applicable)
  pensionBreakEvenYear?: number;

  // Summary insight
  summary: string;
}
