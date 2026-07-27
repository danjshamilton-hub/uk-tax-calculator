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

  // Annual bonus, spread evenly across the tax year
  bonusAmount: number;
  bonusSacrificePercentage: number;

  // Company car (salary sacrifice) and cash car allowance
  hasCompanyCar: boolean;
  /** Annual salary sacrifice for the car */
  carSalarySacrificeAnnual: number;
  carP11DValue: number;
  carBIKPercentage: number;
  /** Annual cash allowance, paid with salary */
  carAllowanceAnnual: number;
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

  /**
   * Start of the maternity or paternity block, in weeks relative to the birth
   * week. Negative starts leave before the birth.
   */
  startWeekOffset: number;

  /**
   * Start of the Shared Parental Leave block, independent of the paternity
   * block. Partners typically take two weeks at the birth and their shared
   * leave months later, so the two need not run back to back.
   */
  sharedStartWeekOffset: number;

  /**
   * Employer's scheme for the maternity block (birth parent) or the paternity
   * block (partner), applied in order from the start of that block.
   */
  payBands: LeavePayBand[];

  /**
   * Employer's scheme for the Shared Parental Leave block, applied in order
   * from the start of that block. Kept separate because enhanced shared
   * parental pay is its own entitlement and must not shift when the paternity
   * weeks change.
   */
  sharedPayBands: LeavePayBand[];

  /** Salary on return to work, as a percentage of pre-leave salary */
  returnSalaryPercent: number;

  /** Employee pension contribution during leave. 0 pauses contributions. */
  employeePensionPercentDuringLeave: number;
  /** Employer keeps contributing on pre-leave salary through the paid weeks */
  employerMaintainsPension: boolean;

  // What happens to the car and allowance while on leave
  /** Keep the company car, so the benefit-in-kind stays taxable all year */
  keepCarDuringLeave: boolean;
  /** Keep deducting the car salary sacrifice during leave */
  continueCarSacrificeDuringLeave: boolean;
  /** Keep paying the cash car allowance during leave */
  continueCarAllowanceDuringLeave: boolean;
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
  /** Indicative weekly amount, for displaying the schedule */
  gross: number;
  statutoryEntitlement: number;
  employeePension: number;
  employerPension: number;

  // Basis for monthly aggregation. Salary is levelled to annual/12 by payroll
  // regardless of how many days a month contains, so it is carried as a
  // proportion of normal pay rather than a cash amount. Statutory pay really is
  // a weekly cash amount and stays one.
  /** Proportion of normal salary paid this week: 1 full pay, 0.5 half pay, 0 statutory-only */
  salaryFactor: number;
  /** Absolute statutory cash for the week, 0 when the employer scheme pays more */
  statutoryWeekly: number;
  /** Employee pension rate applied to actual pay this week */
  employeePensionRate: number;
  employerPensionRate: number;
  /** Employer contributes on pre-leave salary rather than actual pay */
  employerOnPreLeaveSalary: boolean;

  /** Proportion of the normal cash car allowance paid this week */
  carAllowanceFactor: number;
  /** Proportion of the normal car salary sacrifice deducted this week */
  carSacrificeFactor: number;
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
