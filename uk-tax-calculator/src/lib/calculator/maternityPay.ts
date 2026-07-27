// Parental leave pay calculator.
//
// Statutory parental pay is defined in weeks, and 39 weeks of leave almost
// always crosses 5 April, so pay is modelled a week at a time from the birth
// date and then aggregated into PAYE tax months and tax years. That is the only
// way the tax consequences land in the right year.
//
// Within a tax year the existing single-year engine (calculateAllResults) does
// the income tax, Adjusted Net Income and take-home work. NI and student loan
// are supplied per pay period instead, because both are assessed on each pay
// period separately rather than cumulatively, and annualising a year with
// months of statutory-only pay would understate them.

import type {
  MaternityInputs,
  MaternityResults,
  MaternityTaxYearResult,
  MaternityTotals,
  MonthlyCashflowRow,
  ParentLeavePlan,
  ParentMonthRow,
  ParentProfile,
  ParentYearResult,
  WeekStatus,
  WeeklyPay,
} from '../../types/maternity';
import type { ScenarioInputs } from '../../types/scenario';
import { calculateAllResults } from './index';
import { calculateNIForPeriod } from './nationalInsurance';
import { calculateIncomeTax } from './incomeTax';
import {
  calculateStudentLoanForPeriod,
  calculatePostgradLoanForPeriod,
} from './studentLoan';
import {
  calculateAnnualChildBenefit,
  calculateChildBenefitCharge,
  calculateTaxFreeChildcareBenefit,
} from './benefits';
import {
  formatTaxYear,
  getRatesForTaxYear,
  getStatutoryPay,
  statutoryWeeklyRate,
} from '../../data/taxYears';
import { constants } from '../../data/constants';

const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = MS_PER_DAY * 7;

// ─── Date helpers (UTC throughout, to keep week and month boundaries stable) ───

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function addMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate())
  );
}

/** Days in a tax year: 365, or 366 when it spans a 29 February */
export function daysInTaxYear(taxYear: number): number {
  const start = Date.UTC(taxYear, 3, 6);
  const end = Date.UTC(taxYear + 1, 3, 6);
  return Math.round((end - start) / MS_PER_DAY);
}

/** The tax year a date falls in: 2026 means 2026/27, which starts 6 April 2026 */
export function taxYearOfDate(date: Date): number {
  const year = date.getUTCFullYear();
  const aprilSixth = Date.UTC(year, 3, 6);
  return date.getTime() >= aprilSixth ? year : year - 1;
}

export interface TaxMonth {
  taxMonth: number; // 1 = 6 April to 5 May
  taxYear: number;
  label: string; // "Apr 2026"
  start: Date;
  end: Date; // inclusive
}

/** The twelve PAYE tax months of a tax year, each running from the 6th to the 5th */
export function getTaxMonths(taxYear: number): TaxMonth[] {
  const yearStart = new Date(Date.UTC(taxYear, 3, 6));
  const months: TaxMonth[] = [];

  for (let m = 1; m <= 12; m++) {
    const start = addMonths(yearStart, m - 1);
    const end = new Date(addMonths(yearStart, m).getTime() - MS_PER_DAY);
    months.push({
      taxMonth: m,
      taxYear,
      label: start.toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      start,
      end,
    });
  }

  return months;
}

// ─── Leave schedule ───

type LeaveKind = 'maternity' | 'paternity' | 'shared';

interface LeaveBlock {
  kind: LeaveKind;
  startWeek: number;
  weeks: number;
  endWeek: number; // exclusive
}

interface LeaveWindow {
  blocks: LeaveBlock[];
  startWeek: number;
  endWeek: number; // exclusive, the end of the last block
  totalWeeks: number;
}

/**
 * The weeks a parent is away from work, as separate blocks relative to the
 * birth week. A partner typically takes two weeks of paternity leave at the
 * birth and their shared parental leave months later, so the blocks each carry
 * their own start and need not run back to back.
 */
function getLeaveWindow(plan: ParentLeavePlan): LeaveWindow {
  const blocks: LeaveBlock[] = [];

  const add = (kind: LeaveKind, startWeek: number, weeks: number) => {
    if (weeks > 0) blocks.push({ kind, startWeek, weeks, endWeek: startWeek + weeks });
  };

  if (plan.role === 'birthParent') {
    add('maternity', plan.startWeekOffset, Math.max(0, plan.maternityLeaveWeeks));
  } else {
    add('paternity', plan.startWeekOffset, Math.max(0, plan.paternityLeaveWeeks));
    add('shared', plan.sharedStartWeekOffset, Math.max(0, plan.sharedLeaveWeeksTaken));
  }

  blocks.sort((a, b) => a.startWeek - b.startWeek);
  const totalWeeks = blocks.reduce((sum, b) => sum + b.weeks, 0);

  return {
    blocks,
    startWeek: blocks.length ? blocks[0].startWeek : plan.startWeekOffset,
    endWeek: blocks.length ? Math.max(...blocks.map(b => b.endWeek)) : plan.startWeekOffset,
    totalWeeks,
  };
}

/** The block a week falls in, and how far into that block it is */
function findLeaveWeek(
  window: LeaveWindow,
  weekIndex: number
): { block: LeaveBlock; indexInBlock: number } | null {
  for (const block of window.blocks) {
    if (weekIndex >= block.startWeek && weekIndex < block.endWeek) {
      return { block, indexInBlock: weekIndex - block.startWeek };
    }
  }

  return null;
}

/**
 * The Shared Parental pots the birth parent creates by curtailing maternity leave.
 * Leave and pay are two separate pools: 52 weeks of leave but only 39 of pay, and
 * the birth parent cannot give up the 2 compulsory weeks of either.
 */
export function calculateSharedPots(birthParentPlan: ParentLeavePlan, taxYear: number) {
  const { maternity, shared } = getStatutoryPay(taxYear);

  const maternityLeaveTaken = Math.max(0, birthParentPlan.maternityLeaveWeeks);
  const maternityPaidTaken = Math.min(maternityLeaveTaken, maternity.maxPaidWeeks);

  return {
    leaveAvailable: Math.min(
      shared.maxLeaveWeeks,
      Math.max(0, maternity.maxLeaveWeeks - maternityLeaveTaken)
    ),
    paidAvailable: Math.min(
      shared.maxPaidWeeks,
      Math.max(0, maternity.maxPaidWeeks - maternityPaidTaken)
    ),
  };
}

interface WeeklyContext {
  profile: ParentProfile;
  plan: ParentLeavePlan;
  /** Statutory weekly rate for the tax year the week falls in */
  statutoryRateForWeek: (weekIndex: number) => number;
  /** The tax year a week falls in */
  weekTaxYear: (weekIndex: number) => number;
  /** ShPP weeks actually funded, after clamping to the shared pay pot */
  fundedSharedWeeks: number;
  baseline: boolean;
}

/** Occupational (employer scheme) pay for a given week of leave, and its label */
function occupationalPay(
  ctx: WeeklyContext,
  block: LeaveBlock,
  indexInBlock: number,
  weeklySalary: number
): { amount: number; label: string } {
  // Each block has its own scheme, counted from the start of that block, so
  // enhanced shared parental pay does not move when paternity weeks change.
  const bands = block.kind === 'shared' ? ctx.plan.sharedPayBands : ctx.plan.payBands;
  let consumed = 0;

  for (const band of bands ?? []) {
    const weeks = Math.max(0, band.weeks);
    if (indexInBlock < consumed + weeks) {
      switch (band.mode) {
        case 'fullPay':
          return { amount: weeklySalary, label: 'Full pay' };
        case 'percentOfSalary': {
          // A band flagged as a percentage but missing its value means the
          // scheme pays a share of salary, not nothing; fall back to statutory
          // by treating it as no occupational entitlement only when explicitly 0.
          const percent = band.percent ?? 50;
          return {
            amount: weeklySalary * (percent / 100),
            label: `${percent}% pay`,
          };
        }
        case 'statutory':
          return { amount: 0, label: '' };
        case 'unpaid':
          return { amount: 0, label: '' };
      }
    }
    consumed += weeks;
  }

  // Past the end of the employer scheme
  return { amount: 0, label: '' };
}

/** Statutory entitlement for a given week of leave, with a label */
function statutoryPayForWeek(
  ctx: WeeklyContext,
  block: LeaveBlock,
  indexInBlock: number,
  weekIndex: number
): { amount: number; label: string; status: WeekStatus } {
  const weeklySalary = ctx.profile.grossSalary / 52;
  const ninetyPercent = weeklySalary * 0.9;
  const flatRate = ctx.statutoryRateForWeek(weekIndex);
  const { maternity } = getStatutoryPay(ctx.weekTaxYear(weekIndex));

  if (block.kind === 'maternity') {
    if (indexInBlock < maternity.higherRateWeeks) {
      // First 6 weeks at 90% of average weekly earnings, uncapped
      return { amount: ninetyPercent, label: 'SMP 90%', status: 'maternity' };
    }
    if (indexInBlock < maternity.maxPaidWeeks) {
      return {
        amount: Math.min(flatRate, ninetyPercent),
        label: 'SMP',
        status: 'maternity',
      };
    }
    // Weeks 40-52 of maternity leave are unpaid
    return { amount: 0, label: 'Unpaid', status: 'unpaid' };
  }

  if (block.kind === 'paternity') {
    return {
      amount: Math.min(flatRate, ninetyPercent),
      label: 'Paternity',
      status: 'paternity',
    };
  }

  // Shared Parental Leave: paid only as far as the shared pay pot reaches
  if (indexInBlock < ctx.fundedSharedWeeks) {
    return {
      amount: Math.min(flatRate, ninetyPercent),
      label: 'ShPP',
      status: 'shared',
    };
  }

  return { amount: 0, label: 'SPL (unpaid)', status: 'unpaid' };
}

// ─── Weekly pay ───

function buildWeeklyPay(ctx: WeeklyContext): (weekIndex: number) => WeeklyPay {
  const { profile, plan } = ctx;
  const window = getLeaveWindow(plan);

  // Average weekly earnings, the basis the statutory schedule is defined against
  const weeklySalary = profile.grossSalary / 52;

  return (weekIndex: number): WeeklyPay => {
    const leaveWeek = ctx.baseline ? null : findLeaveWeek(window, weekIndex);

    if (!leaveWeek) {
      // Working. After the leave ends, salary may be reduced (part-time return).
      const returnedToWork = !ctx.baseline && window.totalWeeks > 0 && weekIndex >= window.endWeek;
      const salaryFactor = returnedToWork ? plan.returnSalaryPercent / 100 : 1;
      const gross = weeklySalary * salaryFactor;

      return {
        weekIndex,
        status: 'working',
        payLabel: salaryFactor === 1 ? 'Full pay' : `${plan.returnSalaryPercent}% pay`,
        gross,
        statutoryEntitlement: 0,
        employeePension: gross * (profile.employeePensionPercentage / 100),
        employerPension: gross * (profile.employerPensionPercentage / 100),
        salaryFactor,
        statutoryWeekly: 0,
        employeePensionRate: profile.employeePensionPercentage,
        employerPensionRate: profile.employerPensionPercentage,
        employerOnPreLeaveSalary: false,
        carAllowanceFactor: 1,
        carSacrificeFactor: 1,
      };
    }

    const { block, indexInBlock } = leaveWeek;
    const statutory = statutoryPayForWeek(ctx, block, indexInBlock, weekIndex);
    const occupational = occupationalPay(ctx, block, indexInBlock, weeklySalary);

    // Employer schemes are inclusive of statutory pay: the employer tops up to
    // the enhanced rate rather than paying it on top.
    const usesOccupational = occupational.amount > statutory.amount;
    const gross = Math.max(statutory.amount, occupational.amount);
    const payLabel = usesOccupational ? occupational.label : statutory.label;
    const status: WeekStatus =
      gross > 0 && statutory.status === 'unpaid' ? block.kind : statutory.status;

    // Occupational pay is a share of normal salary and is levelled by payroll
    // like any other salary; statutory pay is a fixed weekly cash amount.
    const salaryFactor =
      usesOccupational && weeklySalary > 0 ? occupational.amount / weeklySalary : 0;
    const statutoryWeekly = usesOccupational ? 0 : statutory.amount;

    // Employee contributions follow actual pay, and can be paused during leave.
    // Modelled as a net-pay/relief-at-source deduction, which is the common case
    // and can be taken from statutory pay. (Under a salary sacrifice arrangement
    // statutory pay cannot be sacrificed — flagged as a warning instead, since
    // the two arrangements differ only in NI treatment and NI is nil on these
    // weeks anyway.)
    const employeePensionRate = Math.min(100, plan.employeePensionPercentDuringLeave);

    // The employer must keep contributing on pre-leave salary through the paid
    // weeks of statutory leave.
    const employerOnPreLeaveSalary = plan.employerMaintainsPension && statutory.amount > 0;
    const employerBase = employerOnPreLeaveSalary ? weeklySalary : gross;

    return {
      weekIndex,
      status,
      payLabel,
      gross,
      statutoryEntitlement: statutory.amount,
      employeePension: gross * (employeePensionRate / 100),
      employerPension: employerBase * (profile.employerPensionPercentage / 100),
      salaryFactor,
      statutoryWeekly,
      employeePensionRate,
      employerPensionRate: profile.employerPensionPercentage,
      employerOnPreLeaveSalary,
      // A cash car allowance normally stops with salary; a car salary sacrifice
      // normally keeps being deducted while you keep the car. Both are policy,
      // so both are settable.
      carAllowanceFactor: plan.continueCarAllowanceDuringLeave ? 1 : 0,
      carSacrificeFactor: plan.continueCarSacrificeDuringLeave ? 1 : 0,
    };
  };
}

// ─── Monthly aggregation ───

interface MonthTotals {
  /** Salary, statutory pay and cash car allowance, before any sacrifice */
  gross: number;
  employeePension: number;
  employerPension: number;
  /** Car salary sacrifice deducted this month */
  carSacrifice: number;
  status: WeekStatus;
  payLabel: string;
  leaveDays: number;
  /** Proportion of the month the company car was held, for the BIK charge */
  carHeldFraction: number;
}

/**
 * Sum a parent's pay across a tax month.
 *
 * Salary is levelled: payroll pays a twelfth of the annual salary every month,
 * whatever the month's length, so a month is worth (annual/12) scaled by the
 * proportion of it spent on normal pay. Statutory parental pay is genuinely a
 * weekly amount, so it is accrued per day at a seventh of the weekly rate — a
 * longer month really does contain more of it.
 */
function aggregateMonth(
  month: TaxMonth,
  birthDate: Date,
  weeklyPay: (weekIndex: number) => WeeklyPay,
  profile: ParentProfile,
  keepCarDuringLeave: boolean
): MonthTotals {
  let gross = 0;
  let employeePension = 0;
  let employerPension = 0;
  let carSacrifice = 0;
  let carHeldDays = 0;
  let leaveDays = 0;

  const statusDays = new Map<WeekStatus, number>();
  const labelDays = new Map<string, number>();

  const daysInMonth =
    Math.round((month.end.getTime() - month.start.getTime()) / MS_PER_DAY) + 1;
  const salaryPerDay = profile.grossSalary / 12 / daysInMonth;
  const allowancePerDay = profile.carAllowanceAnnual / 12 / daysInMonth;
  const sacrificePerDay = profile.hasCompanyCar
    ? profile.carSalarySacrificeAnnual / 12 / daysInMonth
    : 0;

  for (let t = month.start.getTime(); t <= month.end.getTime(); t += MS_PER_DAY) {
    const weekIndex = Math.floor((t - birthDate.getTime()) / MS_PER_WEEK);
    const week = weeklyPay(weekIndex);
    const onLeave = week.status !== 'working';

    // A cash car allowance is pay, so it counts towards gross
    const dayPay =
      week.salaryFactor * salaryPerDay +
      week.statutoryWeekly / 7 +
      week.carAllowanceFactor * allowancePerDay;
    const employerBase = week.employerOnPreLeaveSalary ? salaryPerDay : dayPay;

    gross += dayPay;
    employeePension += dayPay * (week.employeePensionRate / 100);
    employerPension += employerBase * (week.employerPensionRate / 100);
    carSacrifice += week.carSacrificeFactor * sacrificePerDay;

    // The benefit-in-kind is charged for as long as the car is held
    if (profile.hasCompanyCar && (!onLeave || keepCarDuringLeave)) carHeldDays++;

    statusDays.set(week.status, (statusDays.get(week.status) ?? 0) + 1);
    labelDays.set(week.payLabel, (labelDays.get(week.payLabel) ?? 0) + 1);
    if (onLeave) leaveDays++;
  }

  const dominant = <T,>(counts: Map<T, number>, fallback: T): T => {
    let best = fallback;
    let bestCount = -1;
    for (const [key, count] of counts) {
      if (count > bestCount) {
        best = key;
        bestCount = count;
      }
    }
    return best;
  };

  return {
    gross,
    employeePension,
    employerPension,
    carSacrifice,
    status: dominant(statusDays, 'working'),
    payLabel: dominant(labelDays, 'Full pay'),
    leaveDays,
    carHeldFraction: carHeldDays / daysInMonth,
  };
}

// ─── Per-parent, per-tax-year calculation ───

interface ParentYearComputation {
  result: ParentYearResult;
  months: {
    month: TaxMonth;
    totals: MonthTotals;
    incomeTax: number;
    nationalInsurance: number;
    studentLoan: number;
    takeHome: number;
  }[];
}

function computeParentYear(
  profile: ParentProfile,
  taxYear: number,
  birthDate: Date,
  weeklyPay: (weekIndex: number) => WeeklyPay,
  keepCarDuringLeave: boolean
): ParentYearComputation {
  const months = getTaxMonths(taxYear).map((month) => ({
    month,
    totals: aggregateMonth(month, birthDate, weeklyPay, profile, keepCarDuringLeave),
  }));

  // A bonus is paid regardless of leave, so it sits in both the plan and the
  // baseline; it matters here because it moves both into higher tax bands.
  const bonusPerMonth = profile.bonusAmount / 12;

  const annualGross =
    months.reduce((sum, m) => sum + m.totals.gross, 0) + profile.bonusAmount;
  const annualEmployeePension = months.reduce((sum, m) => sum + m.totals.employeePension, 0);
  const annualEmployerPension = months.reduce((sum, m) => sum + m.totals.employerPension, 0);
  const annualCarSacrifice = months.reduce((sum, m) => sum + m.totals.carSacrifice, 0);
  const carProRataFactor =
    months.reduce((sum, m) => sum + m.totals.carHeldFraction, 0) / 12;

  // NI and student loan are assessed per pay period, so they are summed month by
  // month rather than derived from the annual total.
  const monthlyDeductions = months.map(({ totals }) => {
    const niablePay = Math.max(
      0,
      totals.gross + bonusPerMonth - totals.employeePension - totals.carSacrifice
    );
    return {
      nationalInsurance: calculateNIForPeriod(niablePay, 12, taxYear),
      studentLoan:
        calculateStudentLoanForPeriod(niablePay, profile.studentLoanPlan, 12, taxYear) +
        calculatePostgradLoanForPeriod(niablePay, profile.hasPostgradLoan, 12, taxYear),
    };
  });

  const annualNI = monthlyDeductions.reduce((sum, m) => sum + m.nationalInsurance, 0);
  const annualStudentLoan = monthlyDeductions.reduce((sum, m) => sum + m.studentLoan, 0);

  // Express the year's actual pension contributions as a percentage so the
  // existing engine reproduces the right pound amounts. The bonus is folded into
  // gross here rather than passed separately, because its own sacrifice is
  // already accounted for in the pension totals.
  const pensionPercent = annualGross > 0 ? (annualEmployeePension / annualGross) * 100 : 0;
  const employerPercent = annualGross > 0 ? (annualEmployerPension / annualGross) * 100 : 0;

  const scenario: ScenarioInputs = {
    name: profile.label,
    taxRegion: profile.taxRegion,
    taxYear,
    grossSalary: annualGross,
    employeePensionPercentage: pensionPercent,
    employerPensionPercentage: employerPercent,
    bonusAmount: 0,
    bonusSacrificePercentage: 0,
    hasCompanyCar: profile.hasCompanyCar,
    carSalarySacrifice: annualCarSacrifice,
    carP11DValue: profile.carP11DValue,
    carBIKPercentage: profile.carBIKPercentage,
    carBIKProRataFactor: carProRataFactor,
    currentAge: profile.currentAge,
    retirementAge: profile.retirementAge,
    studentLoanPlan: profile.studentLoanPlan,
    hasPostgradLoan: profile.hasPostgradLoan,
    // Child Benefit and Tax-Free Childcare are assessed on the household, not on
    // one parent, so they are handled outside this per-parent calculation.
    hasChildren: false,
    numberOfChildren: 0,
    claimsChildBenefit: false,
    nationalInsuranceOverride: annualNI,
    studentLoanOverride: annualStudentLoan,
    postgradLoanOverride: 0,
  };

  const yearResult = calculateAllResults(scenario);

  // Income tax month by month on the cumulative PAYE basis: annualise the pay
  // received so far, tax it, take the elapsed fraction, and deduct whatever has
  // already been paid. When pay falls mid-year this naturally produces a refund,
  // which is what actually happens on a payslip during parental leave. By month
  // 12 the running total equals the annual figure exactly.
  let cumulativeTaxablePay = 0;
  let taxPaidToDate = 0;

  const monthDetails = months.map(({ month, totals }, i) => {
    const taxablePay = Math.max(
      0,
      totals.gross + bonusPerMonth - totals.employeePension - totals.carSacrifice
    );
    cumulativeTaxablePay += taxablePay;

    const periodsElapsed = i + 1;
    const annualisedTax = calculateIncomeTax(
      cumulativeTaxablePay * (12 / periodsElapsed),
      profile.taxRegion,
      taxYear
    );
    const taxDueToDate = annualisedTax * (periodsElapsed / 12);
    const incomeTax = taxDueToDate - taxPaidToDate;
    taxPaidToDate = taxDueToDate;

    const { nationalInsurance, studentLoan } = monthlyDeductions[i];
    const takeHome = taxablePay - incomeTax - nationalInsurance - studentLoan;

    return { month, totals, incomeTax, nationalInsurance, studentLoan, takeHome };
  });

  const weeksOnLeave = months.reduce((sum, m) => sum + m.totals.leaveDays, 0) / 7;

  return {
    result: {
      label: profile.label,
      grossPay: annualGross,
      employeePension: annualEmployeePension,
      employerPension: annualEmployerPension,
      incomeTax: yearResult.incomeTax,
      nationalInsurance: annualNI,
      studentLoan: annualStudentLoan,
      takeHome: yearResult.annualTakeHome,
      adjustedNetIncome: yearResult.adjustedNetIncome,
      weeksOnLeave,
    },
    months: monthDetails,
  };
}

// ─── Main entry point ───

/**
 * The week-by-week pay schedule for one parent's leave, relative to the birth
 * week. Useful for inspecting the statutory schedule directly.
 */
export function getWeeklySchedule(inputs: MaternityInputs, parent: 1 | 2): WeeklyPay[] {
  const birthDate = parseDate(inputs.birthDate);
  const profile = parent === 1 ? inputs.parent1 : inputs.parent2;
  const plan: ParentLeavePlan = {
    ...(parent === 1 ? inputs.plan1 : inputs.plan2),
    role: parent === 1 ? 'birthParent' : 'partner',
  };

  const pots = calculateSharedPots(
    { ...inputs.plan1, role: 'birthParent' },
    taxYearOfDate(birthDate)
  );
  const sharedLeaveUsed = Math.min(Math.max(0, plan.sharedLeaveWeeksTaken), pots.leaveAvailable);
  const fundedSharedWeeks = Math.min(
    Math.max(0, plan.sharedPaidWeeksTaken),
    pots.paidAvailable,
    sharedLeaveUsed
  );

  const weekTaxYear = (weekIndex: number) =>
    taxYearOfDate(new Date(birthDate.getTime() + weekIndex * MS_PER_WEEK));

  const weeklyPay = buildWeeklyPay({
    profile,
    plan: { ...plan, sharedLeaveWeeksTaken: sharedLeaveUsed, sharedPaidWeeksTaken: fundedSharedWeeks },
    statutoryRateForWeek: (weekIndex) => statutoryWeeklyRate(weekTaxYear(weekIndex)),
    weekTaxYear,
    fundedSharedWeeks: plan.role === 'partner' ? fundedSharedWeeks : 0,
    baseline: false,
  });

  const window = getLeaveWindow({
    ...plan,
    sharedLeaveWeeksTaken: sharedLeaveUsed,
  });

  // Only the weeks actually spent on leave. Blocks can be far apart — two weeks
  // of paternity at the birth and shared leave months later — so the weeks in
  // between are working weeks and are not part of the schedule.
  const schedule: WeeklyPay[] = [];
  for (const block of window.blocks) {
    for (let w = block.startWeek; w < block.endWeek; w++) {
      if (findLeaveWeek(window, w)?.block === block) schedule.push(weeklyPay(w));
    }
  }
  return schedule.sort((a, b) => a.weekIndex - b.weekIndex);
}

export function calculateMaternityResults(inputs: MaternityInputs): MaternityResults {
  const birthDate = parseDate(inputs.birthDate);
  const warnings: string[] = [];

  const birthYear = taxYearOfDate(birthDate);
  const pots = calculateSharedPots(inputs.plan1, birthYear);

  // Clamp the partner's shared claims to what the birth parent actually released
  const requestedSharedLeave = Math.max(0, inputs.plan2.sharedLeaveWeeksTaken);
  const requestedSharedPaid = Math.max(0, inputs.plan2.sharedPaidWeeksTaken);
  const sharedLeaveUsed = Math.min(requestedSharedLeave, pots.leaveAvailable);
  const fundedSharedWeeks = Math.min(requestedSharedPaid, pots.paidAvailable, sharedLeaveUsed);

  if (requestedSharedLeave > pots.leaveAvailable) {
    warnings.push(
      `Only ${pots.leaveAvailable} weeks of Shared Parental Leave are available — ` +
        `${inputs.parent1.label} taking ${inputs.plan1.maternityLeaveWeeks} weeks of maternity leave ` +
        `leaves that much of the 52-week entitlement. Capped at ${sharedLeaveUsed} weeks.`
    );
  }
  if (requestedSharedPaid > pots.paidAvailable) {
    warnings.push(
      `Only ${pots.paidAvailable} weeks of Shared Parental Pay are available — ` +
        `just 39 of the 52 weeks are ever paid. Capped at ${fundedSharedWeeks} paid weeks.`
    );
  }
  if (requestedSharedPaid > sharedLeaveUsed) {
    warnings.push('Shared Parental Pay weeks cannot exceed the Shared Parental Leave weeks taken.');
  }

  // Paternity and shared leave are separate blocks; overlapping them would count
  // the same weeks twice, so the overlap is dropped and flagged.
  const paternityEnd = inputs.plan2.startWeekOffset + Math.max(0, inputs.plan2.paternityLeaveWeeks);
  if (
    inputs.plan2.paternityLeaveWeeks > 0 &&
    sharedLeaveUsed > 0 &&
    inputs.plan2.sharedStartWeekOffset < paternityEnd
  ) {
    warnings.push(
      `${inputs.parent2.label}'s shared parental leave starts before their paternity leave ` +
        `ends (week ${paternityEnd}). The overlapping weeks are only counted once — start the ` +
        'shared block later to take them all.'
    );
  }

  const plan1: ParentLeavePlan = { ...inputs.plan1, role: 'birthParent' };
  const plan2: ParentLeavePlan = {
    ...inputs.plan2,
    role: 'partner',
    sharedLeaveWeeksTaken: sharedLeaveUsed,
    sharedPaidWeeksTaken: fundedSharedWeeks,
  };

  // Which tax years the leave touches
  const window1 = getLeaveWindow(plan1);
  const window2 = getLeaveWindow(plan2);
  const leaveWeeks = [
    ...(window1.totalWeeks > 0 ? [window1.startWeek, window1.endWeek] : []),
    ...(window2.totalWeeks > 0 ? [window2.startWeek, window2.endWeek] : []),
  ];
  const firstWeek = leaveWeeks.length ? Math.min(...leaveWeeks) : 0;
  const lastWeek = leaveWeeks.length ? Math.max(...leaveWeeks) : 0;

  const firstYear = taxYearOfDate(new Date(birthDate.getTime() + firstWeek * MS_PER_WEEK));
  const lastYear = taxYearOfDate(new Date(birthDate.getTime() + lastWeek * MS_PER_WEEK));
  const affectedYears: number[] = [];
  for (let y = firstYear; y <= lastYear; y++) affectedYears.push(y);

  const weekTaxYear = (weekIndex: number) =>
    taxYearOfDate(new Date(birthDate.getTime() + weekIndex * MS_PER_WEEK));

  const makeContext = (
    profile: ParentProfile,
    plan: ParentLeavePlan,
    baseline: boolean
  ): WeeklyContext => ({
    profile,
    plan,
    statutoryRateForWeek: (weekIndex) => statutoryWeeklyRate(weekTaxYear(weekIndex)),
    weekTaxYear,
    fundedSharedWeeks: plan.role === 'partner' ? fundedSharedWeeks : 0,
    baseline,
  });

  const pay1 = buildWeeklyPay(makeContext(inputs.parent1, plan1, false));
  const pay2 = buildWeeklyPay(makeContext(inputs.parent2, plan2, false));
  const base1 = buildWeeklyPay(makeContext(inputs.parent1, plan1, true));
  const base2 = buildWeeklyPay(makeContext(inputs.parent2, plan2, true));

  // Note where a salary sacrifice arrangement would behave differently
  for (const [profile, plan, pay] of [
    [inputs.parent1, plan1, pay1],
    [inputs.parent2, plan2, pay2],
  ] as const) {
    const window = getLeaveWindow(plan);
    if (plan.employeePensionPercentDuringLeave <= 0) continue;

    for (let w = window.startWeek; w < window.endWeek; w++) {
      const week = pay(w);
      if (week.employeePension > 0 && week.gross <= week.statutoryEntitlement + 0.01) {
        warnings.push(
          `${profile.label}'s contributions are modelled as a normal pension deduction from ` +
            'statutory pay. If their pension is via salary sacrifice, contributions cannot be ' +
            'taken from statutory parental pay and would stop for those weeks instead.'
        );
        break;
      }
    }
  }

  // ─── Per tax year ───

  const taxYears: MaternityTaxYearResult[] = [];
  const monthlyCashflow: MonthlyCashflowRow[] = [];

  for (const taxYear of affectedYears) {
    const rates = getRatesForTaxYear(taxYear);

    const p1 = computeParentYear(inputs.parent1, taxYear, birthDate, pay1, plan1.keepCarDuringLeave);
    const p2 = computeParentYear(inputs.parent2, taxYear, birthDate, pay2, plan2.keepCarDuringLeave);
    // The baseline is a normal working year, so the car is always held
    const b1 = computeParentYear(inputs.parent1, taxYear, birthDate, base1, true);
    const b2 = computeParentYear(inputs.parent2, taxYear, birthDate, base2, true);

    const benefits = householdBenefits(
      inputs,
      taxYear,
      p1.result.adjustedNetIncome,
      p2.result.adjustedNetIncome
    );
    const benefitsBaseline = householdBenefits(
      inputs,
      taxYear,
      b1.result.adjustedNetIncome,
      b2.result.adjustedNetIncome
    );

    const householdNet =
      p1.result.takeHome + p2.result.takeHome + benefits.netChildBenefit + benefits.taxFreeChildcare;
    const householdNetBaseline =
      b1.result.takeHome +
      b2.result.takeHome +
      benefitsBaseline.netChildBenefit +
      benefitsBaseline.taxFreeChildcare;

    taxYears.push({
      taxYear,
      taxYearLabel: formatTaxYear(taxYear),
      isProjected: rates.isProjected,
      parent1: p1.result,
      parent2: p2.result,
      parent1Baseline: b1.result,
      parent2Baseline: b2.result,
      childBenefitReceived: benefits.received,
      childBenefitCharge: benefits.charge,
      netChildBenefit: benefits.netChildBenefit,
      taxFreeChildcareBenefit: benefits.taxFreeChildcare,
      higherAdjustedNetIncome: benefits.higherAni,
      childBenefitChargeBaseline: benefitsBaseline.charge,
      netChildBenefitBaseline: benefitsBaseline.netChildBenefit,
      taxFreeChildcareBenefitBaseline: benefitsBaseline.taxFreeChildcare,
      householdNet,
      householdNetBaseline,
    });

    // Monthly rows
    for (let i = 0; i < 12; i++) {
      const m1 = p1.months[i];
      const m2 = p2.months[i];
      const mb1 = b1.months[i];
      const mb2 = b2.months[i];

      const row1 = toMonthRow(m1, mb1.takeHome);
      const row2 = toMonthRow(m2, mb2.takeHome);

      monthlyCashflow.push({
        taxMonth: m1.month.taxMonth,
        monthLabel: m1.month.label,
        taxYear,
        taxYearLabel: formatTaxYear(taxYear),
        isProjectedYear: rates.isProjected,
        parent1: row1,
        parent2: row2,
        householdNet:
          row1.takeHome + row2.takeHome + (benefits.netChildBenefit + benefits.taxFreeChildcare) / 12,
        householdNetBaseline:
          mb1.takeHome +
          mb2.takeHome +
          (benefitsBaseline.netChildBenefit + benefitsBaseline.taxFreeChildcare) / 12,
      });
    }
  }

  // ─── Totals and headline figures ───

  const plan = totalsFrom(taxYears, 'plan');
  const baseline = totalsFrom(taxYears, 'baseline');

  const grossDrop = baseline.grossTotal - plan.grossTotal;
  const netDrop = baseline.netTotal - plan.netTotal;
  const taxSaved = baseline.taxTotal - plan.taxTotal;
  const benefitsChange = taxYears.reduce(
    (sum, y) =>
      sum +
      (y.netChildBenefit + y.taxFreeChildcareBenefit) -
      (y.netChildBenefitBaseline + y.taxFreeChildcareBenefitBaseline),
    0
  );

  const employeePensionForgone = baseline.employeePension - plan.employeePension;
  const employerPensionForgone = baseline.employerPension - plan.employerPension;
  const totalPensionForgone = employeePensionForgone + employerPensionForgone;

  // A one-off shortfall left to compound until retirement
  const yearsToRetirement = Math.max(
    0,
    inputs.parent1.retirementAge - inputs.parent1.currentAge
  );
  const growth = 1 + constants.defaultInvestmentReturn / 100;
  const potAtRetirementDifference = totalPensionForgone * Math.pow(growth, yearsToRetirement);

  const totalLeaveWeeks = window1.totalWeeks + window2.totalWeeks;

  const lowestMonth = monthlyCashflow.reduce<MonthlyCashflowRow | null>(
    (lowest, row) => (lowest === null || row.householdNet < lowest.householdNet ? row : lowest),
    null
  );

  const results: MaternityResults = {
    taxYears,
    monthlyCashflow,
    baseline,
    plan,
    grossDrop,
    netDrop,
    taxSaved,
    benefitsChange,
    pensionForgone: {
      employee: employeePensionForgone,
      employer: employerPensionForgone,
      total: totalPensionForgone,
      potAtRetirementDifference,
    },
    totalLeaveWeeks,
    netCostPerWeekOfLeave: totalLeaveWeeks > 0 ? netDrop / totalLeaveWeeks : 0,
    lowestMonthlyHouseholdNet: lowestMonth
      ? { monthLabel: lowestMonth.monthLabel, amount: lowestMonth.householdNet }
      : null,
    sharedPots: {
      leaveAvailable: pots.leaveAvailable,
      leaveUsed: sharedLeaveUsed,
      paidAvailable: pots.paidAvailable,
      paidUsed: fundedSharedWeeks,
    },
    insights: [],
    warnings,
  };

  results.insights = generateInsights(inputs, results, plan1, plan2);
  results.warnings.push(...eligibilityWarnings(inputs, birthYear));

  return results;
}

// ─── Household benefits ───

function householdBenefits(
  inputs: MaternityInputs,
  taxYear: number,
  ani1: number,
  ani2: number
) {
  const higherAni = Math.max(ani1, ani2);
  const { threshold } = getRatesForTaxYear(taxYear).benefitsThresholds.taxFreeChildcare;

  const received =
    inputs.hasChildren && inputs.claimsChildBenefit
      ? calculateAnnualChildBenefit(inputs.numberOfChildren, taxYear)
      : 0;

  // The High Income Child Benefit Charge falls on the higher earner only
  const charge =
    inputs.hasChildren && inputs.claimsChildBenefit
      ? calculateChildBenefitCharge(higherAni, true, inputs.numberOfChildren, taxYear)
      : 0;

  // Tax-Free Childcare needs BOTH parents at or below the threshold
  const bothEligible = ani1 <= threshold && ani2 <= threshold;
  const taxFreeChildcare =
    inputs.hasChildren && inputs.usesTaxFreeChildcare && bothEligible
      ? calculateTaxFreeChildcareBenefit(higherAni, true, inputs.numberOfChildren, taxYear)
      : 0;

  return {
    received,
    charge,
    netChildBenefit: received - charge,
    taxFreeChildcare,
    higherAni,
  };
}

// ─── Helpers ───

function toMonthRow(
  detail: ParentYearComputation['months'][number],
  takeHomeBaseline: number
): ParentMonthRow {
  return {
    status: detail.totals.status,
    payLabel: detail.totals.payLabel,
    grossPay: detail.totals.gross,
    incomeTax: detail.incomeTax,
    nationalInsurance: detail.nationalInsurance,
    studentLoan: detail.studentLoan,
    employeePension: detail.totals.employeePension,
    employerPension: detail.totals.employerPension,
    takeHome: detail.takeHome,
    takeHomeBaseline,
  };
}

function totalsFrom(
  taxYears: MaternityTaxYearResult[],
  which: 'plan' | 'baseline'
): MaternityTotals {
  const pick = (y: MaternityTaxYearResult) =>
    which === 'plan'
      ? { p1: y.parent1, p2: y.parent2, charge: y.childBenefitCharge, net: y.householdNet }
      : {
          p1: y.parent1Baseline,
          p2: y.parent2Baseline,
          charge: y.childBenefitChargeBaseline,
          net: y.householdNetBaseline,
        };

  return taxYears.reduce<MaternityTotals>(
    (totals, year) => {
      const { p1, p2, charge, net } = pick(year);
      return {
        grossTotal: totals.grossTotal + p1.grossPay + p2.grossPay,
        netTotal: totals.netTotal + net,
        taxTotal:
          totals.taxTotal +
          p1.incomeTax +
          p2.incomeTax +
          p1.nationalInsurance +
          p2.nationalInsurance +
          p1.studentLoan +
          p2.studentLoan +
          charge,
        employeePension: totals.employeePension + p1.employeePension + p2.employeePension,
        employerPension: totals.employerPension + p1.employerPension + p2.employerPension,
      };
    },
    { grossTotal: 0, netTotal: 0, taxTotal: 0, employeePension: 0, employerPension: 0 }
  );
}

function eligibilityWarnings(inputs: MaternityInputs, taxYear: number): string[] {
  const warnings: string[] = [];
  const lel = getRatesForTaxYear(taxYear).lowerEarningsLimitWeekly;

  for (const profile of [inputs.parent1, inputs.parent2]) {
    const weeklyEarnings = profile.grossSalary / 52;
    if (profile.grossSalary > 0 && weeklyEarnings < lel) {
      warnings.push(
        `${profile.label} earns £${weeklyEarnings.toFixed(2)}/week, below the £${lel} Lower ` +
          'Earnings Limit, so would not qualify for statutory parental pay (Maternity ' +
          'Allowance may apply instead — not modelled here).'
      );
    }
  }

  return warnings;
}

function money(amount: number): string {
  return `£${Math.round(Math.abs(amount)).toLocaleString('en-GB')}`;
}

function generateInsights(
  inputs: MaternityInputs,
  results: MaternityResults,
  plan1: ParentLeavePlan,
  plan2: ParentLeavePlan
): string[] {
  const insights: string[] = [];

  if (results.grossDrop > 0) {
    const retained = results.grossDrop - results.netDrop;
    const costPer100 = results.grossDrop > 0 ? (results.netDrop / results.grossDrop) * 100 : 0;
    insights.push(
      `💷 Gross pay falls ${money(results.grossDrop)} but take-home only falls ` +
        `${money(results.netDrop)} — tax, NI and benefits absorb ${money(retained)}. ` +
        `Every £100 of pay given up costs you £${costPer100.toFixed(0)}.`
    );
  }

  if (results.totalLeaveWeeks > 0) {
    insights.push(
      `📅 ${results.totalLeaveWeeks.toFixed(0)} weeks of leave between you, at a net cost of ` +
        `${money(results.netCostPerWeekOfLeave)} per week.`
    );
  }

  // Threshold movements, year by year
  for (const year of results.taxYears) {
    const tfcGain = year.taxFreeChildcareBenefit - year.taxFreeChildcareBenefitBaseline;
    if (tfcGain > 0) {
      insights.push(
        `🎯 Both parents' Adjusted Net Income drops to or below £100,000 in ${year.taxYearLabel} — ` +
          `Tax-Free Childcare regained, worth ${money(tfcGain)}.`
      );
    } else if (tfcGain < 0) {
      insights.push(
        `⚠️ Tax-Free Childcare is lost in ${year.taxYearLabel}, worth ${money(tfcGain)}.`
      );
    }

    const chargeDrop = year.childBenefitChargeBaseline - year.childBenefitCharge;
    if (chargeDrop > 0) {
      insights.push(
        `👶 The High Income Child Benefit Charge falls ${money(chargeDrop)} in ` +
          `${year.taxYearLabel} — the higher earner's Adjusted Net Income drops to ` +
          `${money(year.higherAdjustedNetIncome)}.`
      );
    }
  }

  if (results.pensionForgone.total > 0) {
    insights.push(
      `🏦 Pension contributions are ${money(results.pensionForgone.total)} lower over the leave ` +
        `— roughly ${money(results.pensionForgone.potAtRetirementDifference)} less at retirement.`
    );
  }

  // Reducing contributions during leave
  for (const [profile, plan] of [
    [inputs.parent1, plan1],
    [inputs.parent2, plan2],
  ] as const) {
    if (
      plan.employeePensionPercentDuringLeave < profile.employeePensionPercentage &&
      getLeaveWindow(plan).totalWeeks > 0
    ) {
      insights.push(
        `⚖️ ${profile.label} drops pension contributions from ` +
          `${profile.employeePensionPercentage}% to ${plan.employeePensionPercentDuringLeave}% ` +
          'during leave — more take-home now, a smaller pot later.'
      );
    }
  }

  // Transferring weeks before the birth parent has used the 90% element
  const statutory = getStatutoryPay(taxYearOfDate(parseDate(inputs.birthDate)));
  if (
    results.sharedPots.paidUsed > 0 &&
    plan1.maternityLeaveWeeks < statutory.maternity.higherRateWeeks
  ) {
    insights.push(
      `🔁 ${inputs.parent1.label} has not used all ${statutory.maternity.higherRateWeeks} weeks ` +
        'of 90%-of-salary maternity pay. Shared Parental Pay is only ever paid at the flat rate, ' +
        'so transferring those weeks costs money.'
    );
  }

  if (results.lowestMonthlyHouseholdNet) {
    insights.push(
      `📉 Tightest month is ${results.lowestMonthlyHouseholdNet.monthLabel} at ` +
        `${money(results.lowestMonthlyHouseholdNet.amount)} household net income.`
    );
  }

  // Low earners capped by the 90% rule
  for (const profile of [inputs.parent1, inputs.parent2]) {
    const ninety = (profile.grossSalary / 52) * 0.9;
    const flat = statutoryWeeklyRate(taxYearOfDate(parseDate(inputs.birthDate)));
    if (profile.grossSalary > 0 && ninety < flat) {
      insights.push(
        `ℹ️ ${profile.label}'s statutory pay is capped at 90% of average weekly earnings ` +
          `(£${ninety.toFixed(2)}/week), below the £${flat.toFixed(2)} standard rate.`
      );
    }
  }

  if (results.taxYears.some((y) => y.isProjected)) {
    insights.push(
      'ℹ️ Part of this leave falls in a tax year whose rates have not been announced. ' +
        'Those figures carry the latest published rates forward.'
    );
  }

  return insights;
}
