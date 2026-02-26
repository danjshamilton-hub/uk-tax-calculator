import type { TaxRegion } from '../data/taxRates2025';
import type { BudgetExpense } from './budget';

/** Salary & personal details (shared between scenarios) */
export interface SalaryState {
  grossSalary: number;
  taxRegion: TaxRegion;
  employeePensionPercentage: number;
  employerPensionPercentage: number;
  currentAge: number;
  retirementAge: number;
}

/** Company car inputs for a single scenario */
export interface CompanyCarState {
  hasCompanyCar: boolean;
  carSalarySacrifice: number;
  carP11DValue: number;
  carBIKPercentage: number;
}

/** Bonus inputs for a single scenario */
export interface BonusState {
  bonusAmount: number;
  bonusSacrificePercentage: number;
}

/** Children-related inputs */
export interface ChildrenState {
  hasChildren: boolean;
  numberOfChildren: number;
  claimsChildBenefitA: boolean;
  claimsChildBenefitB: boolean;
  usesTaxFreeChildcareA: boolean;
  usesTaxFreeChildcareB: boolean;
}

/** Scenario B overrides (fields that can differ from A) */
export interface ScenarioBState {
  grossSalary: number;
  employeePensionPercentage: number;
  companyCar: CompanyCarState;
  bonus: BonusState;
}

/** House purchase inputs */
export interface HouseState {
  houseValuation: number;
  purchasePrice: number;
  depositPercentage: number;
  partnerGrossSalary: number;
  currentBalance: number;
  currentHouseSalePrice: number;
  currentHouseMortgage: number;
  movingCosts: number;
  mortgageInterestRate: number;
  mortgageTerm: number;
  useGrossForMortgage: boolean;
  mortgageMaxOverride: number;
}

/** Budget tab state */
export interface BudgetState {
  expenses: BudgetExpense[];
  partner2TakeHome: number;
  jointContrib1: number;
  jointContrib2: number;
  mortgageOverride: number | null;
  useMortgageOverride: boolean;
  projectionYears: number;
  savingsGrowthRate: number;
}

/** Default values */
export const DEFAULT_SALARY: SalaryState = {
  grossSalary: 50000,
  taxRegion: 'scotland',
  employeePensionPercentage: 5,
  employerPensionPercentage: 3,
  currentAge: 35,
  retirementAge: 65,
};

export const DEFAULT_COMPANY_CAR: CompanyCarState = {
  hasCompanyCar: false,
  carSalarySacrifice: 500,
  carP11DValue: 35000,
  carBIKPercentage: 2,
};

export const DEFAULT_BONUS: BonusState = {
  bonusAmount: 0,
  bonusSacrificePercentage: 0,
};

export const DEFAULT_CHILDREN: ChildrenState = {
  hasChildren: false,
  numberOfChildren: 2,
  claimsChildBenefitA: true,
  claimsChildBenefitB: true,
  usesTaxFreeChildcareA: true,
  usesTaxFreeChildcareB: true,
};

export const DEFAULT_SCENARIO_B: ScenarioBState = {
  grossSalary: 50000,
  employeePensionPercentage: 10,
  companyCar: { ...DEFAULT_COMPANY_CAR },
  bonus: { ...DEFAULT_BONUS },
};

export const DEFAULT_HOUSE: HouseState = {
  houseValuation: 300000,
  purchasePrice: 300000,
  depositPercentage: 10,
  partnerGrossSalary: 0,
  currentBalance: 50000,
  currentHouseSalePrice: 0,
  currentHouseMortgage: 0,
  movingCosts: 5000,
  mortgageInterestRate: 4.5,
  mortgageTerm: 25,
  useGrossForMortgage: false,
  mortgageMaxOverride: 0,
};
