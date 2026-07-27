import type { TaxRegion } from '../data/taxYears';
import type { StudentLoanPlan } from '../data/taxYears';
import type { BudgetExpense } from './budget';
import type { ParentLeavePlan } from './maternity';

/** Salary & personal details (shared between scenarios) */
export interface SalaryState {
  grossSalary: number;
  taxRegion: TaxRegion;
  employeePensionPercentage: number;
  employerPensionPercentage: number;
  currentAge: number;
  retirementAge: number;
  studentLoanPlan?: StudentLoanPlan; // shared between scenarios, defaults to 'none'
  hasPostgradLoan?: boolean;
}

/** Company car inputs for a single scenario */
export interface CompanyCarState {
  hasCompanyCar: boolean;
  carSalarySacrifice: number;
  carP11DValue: number;
  carBIKPercentage: number;
  carAllowance?: number; // monthly cash allowance, taxed as normal salary (independent of company car)
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
  employerPensionPercentage?: number; // defaults to Scenario A's value if unset
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

/** Details belonging to a person rather than a scenario */
export interface PersonalDetails {
  taxRegion: TaxRegion;
  currentAge: number;
  retirementAge: number;
  studentLoanPlan?: StudentLoanPlan;
  hasPostgradLoan?: boolean;
}

/**
 * Partner 2's full profile, mirroring the fields Partner 1 gets from
 * SalaryState + CompanyCarState + BonusState + ScenarioBState. Kept in its own
 * state key so Partner 1's saved data is untouched.
 */
export interface Partner2State extends PersonalDetails {
  /** Whether the household has a second earner at all */
  enabled: boolean;
  grossSalary: number;
  employeePensionPercentage: number;
  employerPensionPercentage: number;
  companyCar: CompanyCarState;
  bonus: BonusState;
  scenarioB: ScenarioBState;
}

/** Maternity & paternity tab state */
export interface MaternityState {
  birthDate: string; // ISO yyyy-mm-dd
  // Both partners' pay and tax details come from the Salary tab; this tab only
  // decides who takes what leave, when.
  plan1: ParentLeavePlan;
  plan2: ParentLeavePlan;
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
  studentLoanPlan: 'none',
  hasPostgradLoan: false,
};

export const DEFAULT_COMPANY_CAR: CompanyCarState = {
  hasCompanyCar: false,
  carSalarySacrifice: 500,
  carP11DValue: 35000,
  carBIKPercentage: 2,
  carAllowance: 0,
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
  employerPensionPercentage: undefined,
  companyCar: { ...DEFAULT_COMPANY_CAR },
  bonus: { ...DEFAULT_BONUS },
};

export const DEFAULT_PARTNER2: Partner2State = {
  enabled: false,
  grossSalary: 40000,
  taxRegion: 'scotland',
  employeePensionPercentage: 5,
  employerPensionPercentage: 3,
  currentAge: 35,
  retirementAge: 65,
  studentLoanPlan: 'none',
  hasPostgradLoan: false,
  companyCar: { ...DEFAULT_COMPANY_CAR },
  bonus: { ...DEFAULT_BONUS },
  scenarioB: {
    grossSalary: 40000,
    employeePensionPercentage: 10,
    employerPensionPercentage: undefined,
    companyCar: { ...DEFAULT_COMPANY_CAR },
    bonus: { ...DEFAULT_BONUS },
  },
};

export const DEFAULT_MATERNITY: MaternityState = {
  // Default to a birth early in the next tax year
  birthDate: '2026-09-01',

  plan1: {
    role: 'birthParent',
    maternityLeaveWeeks: 39,
    paternityLeaveWeeks: 0,
    sharedLeaveWeeksTaken: 0,
    sharedPaidWeeksTaken: 0,
    startWeekOffset: 0,
    sharedStartWeekOffset: 0,
    // A common UK occupational scheme: 3 months full pay, 3 months half pay,
    // then statutory for the rest of the paid period
    payBands: [
      { weeks: 13, mode: 'fullPay' },
      { weeks: 13, mode: 'percentOfSalary', percent: 50 },
      { weeks: 13, mode: 'statutory' },
    ],
    sharedPayBands: [{ weeks: 52, mode: 'statutory' }],
    returnSalaryPercent: 100,
    employeePensionPercentDuringLeave: 5,
    employerMaintainsPension: true,
    keepCarDuringLeave: true,
    continueCarSacrificeDuringLeave: true,
    continueCarAllowanceDuringLeave: false,
  },

  plan2: {
    role: 'partner',
    maternityLeaveWeeks: 0,
    paternityLeaveWeeks: 2,
    sharedLeaveWeeksTaken: 0,
    sharedPaidWeeksTaken: 0,
    startWeekOffset: 0,
    // Shared leave usually starts once the birth parent's leave is winding down
    sharedStartWeekOffset: 26,
    // Paternity is usually paid in full by the employer; shared parental pay
    // defaults to statutory until told otherwise.
    payBands: [{ weeks: 2, mode: 'fullPay' }],
    sharedPayBands: [{ weeks: 52, mode: 'statutory' }],
    returnSalaryPercent: 100,
    employeePensionPercentDuringLeave: 5,
    employerMaintainsPension: true,
    keepCarDuringLeave: true,
    continueCarSacrificeDuringLeave: true,
    continueCarAllowanceDuringLeave: false,
  },
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
