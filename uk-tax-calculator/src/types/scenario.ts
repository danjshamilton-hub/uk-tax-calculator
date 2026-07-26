// Core type definitions for tax calculator scenarios

import type { TaxRegion } from '../data/taxYears';
import type { StudentLoanPlan } from '../data/taxYears';

export interface ScenarioInputs {
  // Basic Info
  name: string;
  taxRegion: TaxRegion;
  /** Tax year to calculate in (2026 = 2026/27). Defaults to DEFAULT_TAX_YEAR. */
  taxYear?: number;

  // Salary & Benefits
  grossSalary: number;
  employeePensionPercentage: number;
  employerPensionPercentage: number;

  // Bonus
  bonusAmount: number;
  bonusSacrificePercentage: number; // 0-100% of bonus to sacrifice to pension

  // Company Car
  hasCompanyCar: boolean;
  carSalarySacrifice: number; // Annual amount (already pro-rated if partial year)
  carP11DValue: number;
  carBIKPercentage: number;
  carBIKProRataFactor?: number; // 0-1, defaults to 1 for full year

  // Cash car allowance (annual) - paid as salary, taxed and NI'd normally, non-pensionable
  carAllowance?: number;

  // Personal
  currentAge: number;
  retirementAge: number;

  // Student Loan
  studentLoanPlan?: StudentLoanPlan; // defaults to 'none'
  hasPostgradLoan?: boolean;

  // Childcare
  hasChildren: boolean;
  numberOfChildren: number;
  claimsChildBenefit?: boolean; // defaults to true when hasChildren

  // House Purchase (optional)
  housePurchase?: HousePurchaseInputs;

  // Per-pay-period deduction overrides.
  // NI and student loan are assessed per pay period rather than cumulatively, so
  // callers modelling uneven pay across a year (parental leave) compute these
  // month by month and supply the totals here instead of letting the annual
  // basis understate them.
  nationalInsuranceOverride?: number;
  studentLoanOverride?: number;
  postgradLoanOverride?: number;
}

export interface HousePurchaseInputs {
  // Property details
  houseValuation: number; // What lender bases mortgage on
  purchasePrice: number; // Actual price being paid
  depositPercentage: number;

  // Income (for combined affordability)
  partnerGrossSalary: number; // Partner's annual gross salary (0 if single)

  // Cash position
  currentBalance: number; // Current savings
  currentHouseSalePrice: number; // Sale price of current property (0 if first-time buyer)
  currentHouseMortgage: number; // Remaining mortgage on current property (0 if none)
  movingCosts: number; // Estimated moving expenses

  // Mortgage terms
  mortgageInterestRate: number; // Annual %, e.g., 5.0
  mortgageTerm: number; // Years, e.g., 25

  // Mortgage calculation options
  useGrossForMortgage?: boolean; // If true, use gross income instead of take-home for 4.5x
  mortgageMaxOverride?: number; // Manual override for max mortgage amount (0 = use calculated)
  yourGrossSalary?: number; // Your gross salary (needed if useGrossForMortgage is true)
}

export interface CalculationResults {
  // Tax Calculations
  grossSalary: number;
  bonusAmount: number;
  bonusSacrificedToPension: number;
  carAllowance: number; // annual cash car allowance (taxed as salary)
  totalGrossIncome: number; // grossSalary + bonus + car allowance (before sacrifice)
  employeePension: number;
  employerPension: number;
  carSalarySacrifice: number;
  bikTaxableAmount: number;
  grossAfterDeductions: number;
  taxableIncome: number;
  incomeTax: number;
  nationalInsurance: number;
  bikTax: number;
  studentLoanRepayment: number; // undergraduate plan repayment
  postgradLoanRepayment: number; // postgraduate loan repayment
  adjustedNetIncome: number;

  // Tax Rates
  effectiveTaxRate: number; // Total deductions / gross income (percentage)
  marginalTaxRate: number; // Rate on the next £1 (percentage)
  marginalNIRate: number; // NI rate on next £1 (percentage)
  marginalStudentLoanRate: number; // Student loan rate on next £1 (percentage)
  combinedMarginalRate: number; // Tax + NI + student loan (+ CB taper) on next £1

  // Headroom to key thresholds
  headroom: ThresholdHeadroom[];

  // Benefits
  childBenefitReceived: number; // annual child benefit paid (0 if not claiming)
  childBenefitCharge: number; // HICBC clawback (0 if not claiming)
  netChildBenefit: number; // received - charge
  taxFreeChildcareBenefit: number;
  freeChildcareLoss: number;

  // Take-home
  annualTakeHome: number;
  monthlyTakeHome: number;

  // Pension Projections
  totalPensionContribution: number;
  pensionPotAt5Years: number;
  pensionPotAtRetirement: number;

  // Mortgage Affordability (basic - without house purchase details)
  maxMortgageCapacity: number;

  // House Purchase Analysis (if inputs provided)
  housePurchase?: HousePurchaseResults;

  // Cliff Edge Warnings
  cliffEdgeWarnings: string[];
}

export interface ThresholdHeadroom {
  name: string;
  threshold: number;
  currentValue: number;
  headroom: number; // Positive = below threshold, negative = above
  marginalRateIfExceeded?: number;
  warning?: string;
}

export interface HousePurchaseResults {
  // Income breakdown
  yourAnnualTakeHome: number;
  partnerAnnualTakeHome: number;
  combinedAnnualTakeHome: number;
  combinedMonthlyTakeHome: number;

  // Mortgage
  maxMortgageCapacity: number; // 4.5x combined annual take-home
  depositAmount: number;
  mortgageNeeded: number; // Based on valuation
  monthlyRepayment: number; // P&I payment

  // Monthly affordability (30% rule)
  affordableMonthlyPayment: number; // 30% of monthly take-home
  monthlyRepaymentPercentage: number; // Actual % of take-home
  isMonthlyAffordable: boolean; // Repayment ≤ 30% threshold

  // Costs
  lbttOrStampDuty: number; // Purchase tax
  totalCashRequired: number; // Deposit + tax + moving

  // Cash position
  houseSaleNetProceeds: number; // Sale price - remaining mortgage
  cashAvailable: number; // Balance + net proceeds
  cashSurplusOrShortfall: number; // Available - Required

  // Affordability
  canAfford: boolean; // All 3 checks pass: mortgage capacity, cash, 30% rule
  affordabilityIssues: string[]; // List of problems if any
  maxAffordablePrice: number; // Max they can actually buy
}
