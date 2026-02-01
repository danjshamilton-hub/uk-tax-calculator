// Core type definitions for tax calculator scenarios

import type { TaxRegion } from '../data/taxRates2025';

export interface ScenarioInputs {
  // Basic Info
  name: string;
  taxRegion: TaxRegion;

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

  // Personal
  currentAge: number;
  retirementAge: number;

  // Childcare
  hasChildren: boolean;
  numberOfChildren: number;

  // House Purchase (optional)
  housePurchase?: HousePurchaseInputs;
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
  totalGrossIncome: number; // grossSalary + bonus (before sacrifice)
  employeePension: number;
  employerPension: number;
  carSalarySacrifice: number;
  bikTaxableAmount: number;
  grossAfterDeductions: number;
  taxableIncome: number;
  incomeTax: number;
  nationalInsurance: number;
  bikTax: number;
  adjustedNetIncome: number;

  // Tax Rates
  effectiveTaxRate: number; // Total deductions / gross income (percentage)
  marginalTaxRate: number; // Rate on the next £1 (percentage)
  marginalNIRate: number; // NI rate on next £1 (percentage)
  combinedMarginalRate: number; // Tax + NI on next £1

  // Headroom to key thresholds
  headroom: ThresholdHeadroom[];

  // Benefits
  childBenefitCharge: number;
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
