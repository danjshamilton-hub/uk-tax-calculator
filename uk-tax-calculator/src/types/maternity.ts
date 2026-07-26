// Parental leave planning types.
//
// The model works a week at a time from the birth date, because statutory pay
// is defined in weeks and leave routinely crosses 5 April. Weekly pay is then
// aggregated into PAYE tax months and tax years so that income tax, NI, student
// loan, Adjusted Net Income and the household benefits all land in the right year.

import type { TaxRegion, StudentLoanPlan } from '../data/taxYears';

/** How an employer's own (occupational) scheme pays a stretch of leave */
export type LeavePayMode =
  | 'fullPay' // 100% of normal salary
  | 'percentOfSalary' // e.g. half pay
  | 'statutory' // statutory pay only
  | 'unpaid';

export interface LeavePayBand {
  weeks: number;
  mode: LeavePayMode;
  /** Only used when mode is 'percentOfSalary' */
  percent?: number;
}

/** Which parent this is, for statutory purposes */
export type LeaveRole = 'birthParent' | 'partner';

/** A parent's pay and tax situation, independent of the leave they take */
export interface ParentProfile {
  label: string;
  grossSalary: number;
  taxRegion: TaxRegion;
  employeePensionPercentage: number;
  employerPensionPercentage: number;
  studentLoanPlan: StudentLoanPlan;
  hasPostgradLoan: boolean;
  currentAge: number;
  retirementAge: number;
}

/** The leave a parent plans to take */
export interface ParentLeavePlan {
  role: LeaveRole;

  /** Birth parent only: total weeks of maternity leave taken, 0-52 */
  maternityLeaveWeeks: number;

  /** Partner only: statutory paternity leave, 0-2 weeks. Not drawn from the shared pot. */
  paternityLeaveWeeks: number;

  /** Partner only: Shared Parental Leave weeks drawn from the shared leave pot */
  sharedLeaveWeeksTaken: number;
  /** Partner only: how many of those SPL weeks are paid as ShPP, from the shared pay pot */
  sharedPaidWeeksTaken: number;

  /** Weeks relative to the birth week. Negative starts leave before the birth. */
  startWeekOffset: number;

  /** Employer's own scheme, applied across the leave in order */
  payBands: LeavePayBand[];

  /** Salary on return to work, as a percentage of pre-leave salary */
  returnSalaryPercent: number;

  /** Employee pension contribution during leave. 0 pauses contributions. */
  employeePensionPercentDuringLeave: number;
  /** Employer keeps contributing on pre-leave salary through the paid weeks */
  employerMaintainsPension: boolean;
}

export interface MaternityInputs {
  /** Birth or due date, ISO yyyy-mm-dd */
  birthDate: string;
  hasChildren: boolean;
  /** Total children in the household, including the new baby */
  numberOfChildren: number;
  claimsChildBenefit: boolean;
  usesTaxFreeChildcare: boolean;

  parent1: ParentProfile;
  parent2: ParentProfile;
  plan1: ParentLeavePlan;
  plan2: ParentLeavePlan;
}

/** What a parent is doing in a given week */
export type WeekStatus = 'working' | 'maternity' | 'paternity' | 'shared' | 'unpaid';

export interface WeeklyPay {
  weekIndex: number; // relative to the birth week
  status: WeekStatus;
  payLabel: string;
  gross: number;
  statutoryEntitlement: number;
  employeePension: number;
  employerPension: number;
}

export interface ParentMonthRow {
  status: WeekStatus;
  payLabel: string;
  grossPay: number;
  incomeTax: number;
  nationalInsurance: number;
  studentLoan: number;
  employeePension: number;
  employerPension: number;
  takeHome: number;
  takeHomeBaseline: number;
}

export interface MonthlyCashflowRow {
  /** PAYE tax month, 1 = 6 April to 5 May */
  taxMonth: number;
  monthLabel: string; // "Apr 2026"
  taxYear: number;
  taxYearLabel: string; // "2026/27"
  isProjectedYear: boolean;
  parent1: ParentMonthRow;
  parent2: ParentMonthRow;
  householdNet: number;
  householdNetBaseline: number;
}

export interface ParentYearResult {
  label: string;
  grossPay: number;
  employeePension: number;
  employerPension: number;
  incomeTax: number;
  nationalInsurance: number;
  studentLoan: number;
  takeHome: number;
  adjustedNetIncome: number;
  weeksOnLeave: number;
}

export interface MaternityTaxYearResult {
  taxYear: number;
  taxYearLabel: string;
  isProjected: boolean;

  parent1: ParentYearResult;
  parent2: ParentYearResult;
  parent1Baseline: ParentYearResult;
  parent2Baseline: ParentYearResult;

  // Household benefits, assessed on both parents together
  childBenefitReceived: number;
  childBenefitCharge: number;
  netChildBenefit: number;
  taxFreeChildcareBenefit: number;
  higherAdjustedNetIncome: number;

  childBenefitChargeBaseline: number;
  netChildBenefitBaseline: number;
  taxFreeChildcareBenefitBaseline: number;

  householdNet: number;
  householdNetBaseline: number;
}

export interface MaternityTotals {
  grossTotal: number;
  netTotal: number;
  taxTotal: number; // income tax + NI + student loan + HICBC
  employeePension: number;
  employerPension: number;
}

export interface PensionImpact {
  employee: number;
  employer: number;
  total: number;
  potAtRetirementDifference: number;
}

export interface MaternityResults {
  taxYears: MaternityTaxYearResult[];
  monthlyCashflow: MonthlyCashflowRow[];

  baseline: MaternityTotals;
  plan: MaternityTotals;

  grossDrop: number;
  netDrop: number;
  taxSaved: number;
  benefitsChange: number;
  pensionForgone: PensionImpact;

  totalLeaveWeeks: number;
  netCostPerWeekOfLeave: number;
  lowestMonthlyHouseholdNet: { monthLabel: string; amount: number } | null;

  /** Shared Parental Leave/Pay pots created by the birth parent curtailing leave */
  sharedPots: {
    leaveAvailable: number;
    leaveUsed: number;
    paidAvailable: number;
    paidUsed: number;
  };

  insights: string[];
  warnings: string[];
}
