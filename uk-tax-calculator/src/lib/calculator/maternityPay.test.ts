import { describe, it, expect } from 'vitest';
import {
  calculateMaternityResults,
  calculateSharedPots,
  getWeeklySchedule,
  getTaxMonths,
  taxYearOfDate,
  daysInTaxYear,
} from './maternityPay';
import type { MaternityInputs, ParentLeavePlan, ParentProfile } from '../../types/maternity';
import { statutoryWeeklyRate } from '../../data/taxYears';

const RATE_2026 = 194.32;

function profile(overrides: Partial<ParentProfile> = {}): ParentProfile {
  return {
    label: 'Partner 1',
    grossSalary: 52000, // £1,000 a week, which keeps the arithmetic legible
    taxRegion: 'scotland',
    employeePensionPercentage: 5,
    employerPensionPercentage: 3,
    studentLoanPlan: 'none',
    hasPostgradLoan: false,
    currentAge: 35,
    retirementAge: 65,
    ...overrides,
  };
}

function birthPlan(overrides: Partial<ParentLeavePlan> = {}): ParentLeavePlan {
  return {
    role: 'birthParent',
    maternityLeaveWeeks: 39,
    paternityLeaveWeeks: 0,
    sharedLeaveWeeksTaken: 0,
    sharedPaidWeeksTaken: 0,
    startWeekOffset: 0,
    payBands: [{ weeks: 52, mode: 'statutory' }],
    returnSalaryPercent: 100,
    employeePensionPercentDuringLeave: 5,
    employerMaintainsPension: true,
    ...overrides,
  };
}

function partnerPlan(overrides: Partial<ParentLeavePlan> = {}): ParentLeavePlan {
  return {
    role: 'partner',
    maternityLeaveWeeks: 0,
    paternityLeaveWeeks: 2,
    sharedLeaveWeeksTaken: 0,
    sharedPaidWeeksTaken: 0,
    startWeekOffset: 0,
    payBands: [{ weeks: 52, mode: 'statutory' }],
    returnSalaryPercent: 100,
    employeePensionPercentDuringLeave: 5,
    employerMaintainsPension: true,
    ...overrides,
  };
}

function inputs(overrides: Partial<MaternityInputs> = {}): MaternityInputs {
  return {
    // April birth keeps a 39-week leave inside one tax year
    birthDate: '2026-04-20',
    hasChildren: true,
    numberOfChildren: 1,
    claimsChildBenefit: true,
    usesTaxFreeChildcare: true,
    parent1: profile(),
    parent2: profile({ label: 'Partner 2' }),
    plan1: birthPlan(),
    plan2: partnerPlan(),
    ...overrides,
  };
}

describe('date helpers', () => {
  it('puts 5 April in the previous tax year and 6 April in the new one', () => {
    expect(taxYearOfDate(new Date(Date.UTC(2027, 3, 5)))).toBe(2026);
    expect(taxYearOfDate(new Date(Date.UTC(2027, 3, 6)))).toBe(2027);
  });

  it('builds twelve tax months running 6th to 5th', () => {
    const months = getTaxMonths(2026);
    expect(months).toHaveLength(12);
    expect(months[0].start.toISOString().slice(0, 10)).toBe('2026-04-06');
    expect(months[0].end.toISOString().slice(0, 10)).toBe('2026-05-05');
    expect(months[11].end.toISOString().slice(0, 10)).toBe('2027-04-05');
  });

  it('counts leap days in the tax year length', () => {
    expect(daysInTaxYear(2026)).toBe(365);
    expect(daysInTaxYear(2027)).toBe(366); // spans 29 February 2028
  });
});

describe('statutory maternity pay schedule', () => {
  it('pays 6 weeks at 90% of earnings then 33 at the flat rate', () => {
    const schedule = getWeeklySchedule(inputs(), 1);
    expect(schedule).toHaveLength(39);

    const awe = 52000 / 52; // £1,000
    for (let i = 0; i < 6; i++) {
      expect(schedule[i].gross).toBeCloseTo(awe * 0.9, 2);
      expect(schedule[i].payLabel).toBe('SMP 90%');
    }
    for (let i = 6; i < 39; i++) {
      expect(schedule[i].gross).toBeCloseTo(RATE_2026, 2);
      expect(schedule[i].payLabel).toBe('SMP');
    }
  });

  it('leaves weeks 40-52 of maternity leave unpaid', () => {
    const schedule = getWeeklySchedule(
      inputs({ plan1: birthPlan({ maternityLeaveWeeks: 52 }) }),
      1
    );
    expect(schedule).toHaveLength(52);
    expect(schedule[39].gross).toBe(0);
    expect(schedule[51].gross).toBe(0);
    expect(schedule[39].status).toBe('unpaid');
  });

  it('caps a low earner at 90% of average weekly earnings throughout', () => {
    // £8,000 a year is £153.85 a week; 90% is £138.46, below the flat rate
    const schedule = getWeeklySchedule(inputs({ parent1: profile({ grossSalary: 8000 }) }), 1);
    const ninety = (8000 / 52) * 0.9;

    expect(ninety).toBeLessThan(RATE_2026);
    for (const week of schedule) {
      expect(week.gross).toBeCloseTo(ninety, 2);
    }
  });

  it('tops up to the employer scheme rather than stacking on top of it', () => {
    const schedule = getWeeklySchedule(
      inputs({
        plan1: birthPlan({
          payBands: [
            { weeks: 26, mode: 'fullPay' },
            { weeks: 13, mode: 'statutory' },
          ],
        }),
      }),
      1
    );

    const weeklySalary = (52000 * 7) / 365;
    expect(schedule[0].gross).toBeCloseTo(weeklySalary, 2); // not salary + SMP
    expect(schedule[0].payLabel).toBe('Full pay');
    expect(schedule[26].gross).toBeCloseTo(RATE_2026, 2);
  });

  it('honours a half-pay band, and never pays less than statutory', () => {
    const schedule = getWeeklySchedule(
      inputs({ plan1: birthPlan({ payBands: [{ weeks: 39, mode: 'percentOfSalary', percent: 50 }] }) }),
      1
    );
    const weeklySalary = (52000 * 7) / 365;

    // Weeks 1-6 are SMP at 90% of earnings, which beats the employer's half pay
    expect(schedule[0].gross).toBeCloseTo((52000 / 52) * 0.9, 2);
    expect(schedule[0].payLabel).toBe('SMP 90%');

    // From week 7 the employer's half pay is the higher of the two
    expect(schedule[6].gross).toBeCloseTo(weeklySalary * 0.5, 2);
    expect(schedule[6].payLabel).toBe('50% pay');
  });
});

describe('shared parental leave and pay pots', () => {
  it('sizes leave and pay as two separate pools', () => {
    // 26 weeks of maternity leave leaves 26 weeks of leave but only 13 of pay
    const pots = calculateSharedPots(birthPlan({ maternityLeaveWeeks: 26 }), 2026);
    expect(pots.leaveAvailable).toBe(26);
    expect(pots.paidAvailable).toBe(13);
  });

  it('caps the leave pot at 50 weeks and the pay pot at 37', () => {
    const pots = calculateSharedPots(birthPlan({ maternityLeaveWeeks: 0 }), 2026);
    expect(pots.leaveAvailable).toBe(50); // 2 weeks are compulsory
    expect(pots.paidAvailable).toBe(37);
  });

  it('releases nothing when the birth parent takes the full 52 weeks', () => {
    const pots = calculateSharedPots(birthPlan({ maternityLeaveWeeks: 52 }), 2026);
    expect(pots.leaveAvailable).toBe(0);
    expect(pots.paidAvailable).toBe(0);
  });

  it('pays shared leave beyond the pay pot as unpaid', () => {
    // Mother takes 26 weeks, so 13 paid weeks are available. Partner takes 20.
    const result = calculateMaternityResults(
      inputs({
        plan1: birthPlan({ maternityLeaveWeeks: 26 }),
        plan2: partnerPlan({ sharedLeaveWeeksTaken: 20, sharedPaidWeeksTaken: 20 }),
      })
    );

    expect(result.sharedPots).toEqual({
      leaveAvailable: 26,
      leaveUsed: 20,
      paidAvailable: 13,
      paidUsed: 13,
    });
    expect(result.warnings.some((w) => w.includes('Shared Parental Pay'))).toBe(true);

    const schedule = getWeeklySchedule(
      inputs({
        plan1: birthPlan({ maternityLeaveWeeks: 26 }),
        plan2: partnerPlan({ sharedLeaveWeeksTaken: 20, sharedPaidWeeksTaken: 20 }),
      }),
      2
    );

    // 2 paternity weeks, then 13 paid ShPP weeks, then 7 unpaid
    expect(schedule).toHaveLength(22);
    expect(schedule.filter((w) => w.payLabel === 'Paternity')).toHaveLength(2);
    expect(schedule.filter((w) => w.payLabel === 'ShPP')).toHaveLength(13);
    expect(schedule.filter((w) => w.payLabel === 'SPL (unpaid)')).toHaveLength(7);
    expect(schedule.slice(15).every((w) => w.gross === 0)).toBe(true);
  });

  it('does not let statutory paternity leave consume either pot', () => {
    const result = calculateMaternityResults(
      inputs({
        plan1: birthPlan({ maternityLeaveWeeks: 39 }),
        plan2: partnerPlan({ paternityLeaveWeeks: 2, sharedLeaveWeeksTaken: 0 }),
      })
    );
    // 39 weeks of maternity leave: 13 leave weeks left, 0 paid weeks left
    expect(result.sharedPots.leaveAvailable).toBe(13);
    expect(result.sharedPots.paidAvailable).toBe(0);
    expect(result.sharedPots.leaveUsed).toBe(0);
  });

  it('pays Shared Parental Pay at the flat rate with no 90% element', () => {
    const schedule = getWeeklySchedule(
      inputs({
        plan1: birthPlan({ maternityLeaveWeeks: 2 }),
        plan2: partnerPlan({ paternityLeaveWeeks: 0, sharedLeaveWeeksTaken: 10, sharedPaidWeeksTaken: 10 }),
      }),
      2
    );
    expect(schedule).toHaveLength(10);
    for (const week of schedule) {
      expect(week.gross).toBeCloseTo(RATE_2026, 2);
    }
  });
});

describe('tax year splitting', () => {
  it('keeps an April birth inside one tax year', () => {
    const result = calculateMaternityResults(inputs({ birthDate: '2026-04-20' }));
    expect(result.taxYears.map((y) => y.taxYear)).toEqual([2026]);
  });

  it('splits a mid-January birth across two tax years', () => {
    const result = calculateMaternityResults(inputs({ birthDate: '2027-01-15' }));
    expect(result.taxYears.map((y) => y.taxYear)).toEqual([2026, 2027]);
    expect(result.taxYears[0].parent1.weeksOnLeave).toBeGreaterThan(0);
    expect(result.taxYears[1].parent1.weeksOnLeave).toBeGreaterThan(0);
  });

  it('flags a leave that runs into an unannounced tax year', () => {
    const result = calculateMaternityResults(inputs({ birthDate: '2027-01-15' }));
    expect(result.taxYears.find((y) => y.taxYear === 2027)?.isProjected).toBe(true);
    expect(result.insights.some((i) => i.includes('have not been announced'))).toBe(true);
  });

  it('uses each week\'s own tax year for the statutory rate', () => {
    expect(statutoryWeeklyRate(2025)).not.toBe(statutoryWeeklyRate(2026));

    // Born 5 January 2026: the flat-rate weeks start in 2025/26 and cross into
    // 2026/27 on 6 April, so the weekly rate steps up mid-leave.
    const schedule = getWeeklySchedule(inputs({ birthDate: '2026-01-05' }), 1);
    expect(schedule[6].gross).toBeCloseTo(statutoryWeeklyRate(2025), 2);
    expect(schedule[38].gross).toBeCloseTo(statutoryWeeklyRate(2026), 2);
  });
});

describe('baseline comparison', () => {
  it('reproduces the salary exactly when nobody takes leave', () => {
    const result = calculateMaternityResults(
      inputs({
        plan1: birthPlan({ maternityLeaveWeeks: 0 }),
        plan2: partnerPlan({ paternityLeaveWeeks: 0 }),
      })
    );
    expect(result.taxYears[0].parent1Baseline.grossPay).toBeCloseTo(52000, 0);
    expect(result.grossDrop).toBeCloseTo(0, 2);
    expect(result.netDrop).toBeCloseTo(0, 2);
  });

  it('drops gross pay by the shortfall between salary and statutory pay', () => {
    const result = calculateMaternityResults(
      inputs({ plan2: partnerPlan({ paternityLeaveWeeks: 0 }) })
    );

    const dailySalary = 52000 / 365;
    const expectedDrop =
      273 * dailySalary - // 39 weeks of salary given up
      (6 * (52000 / 52) * 0.9 + 33 * RATE_2026); // statutory pay received

    expect(result.grossDrop).toBeCloseTo(expectedDrop, 0);
  });

  it('costs less after tax than the headline gross drop', () => {
    const result = calculateMaternityResults(
      inputs({ plan2: partnerPlan({ paternityLeaveWeeks: 0 }) })
    );
    expect(result.netDrop).toBeGreaterThan(0);
    expect(result.netDrop).toBeLessThan(result.grossDrop);
    expect(result.taxSaved).toBeGreaterThan(0);
    expect(result.netCostPerWeekOfLeave).toBeCloseTo(result.netDrop / 39, 2);
  });
});

describe('monthly cashflow', () => {
  it('sums exactly to each parent\'s annual figures', () => {
    const result = calculateMaternityResults(inputs({ birthDate: '2027-01-15' }));

    for (const year of result.taxYears) {
      const months = result.monthlyCashflow.filter((m) => m.taxYear === year.taxYear);
      expect(months).toHaveLength(12);

      const grossP1 = months.reduce((s, m) => s + m.parent1.grossPay, 0);
      const takeHomeP1 = months.reduce((s, m) => s + m.parent1.takeHome, 0);
      const niP1 = months.reduce((s, m) => s + m.parent1.nationalInsurance, 0);

      expect(grossP1).toBeCloseTo(year.parent1.grossPay, 2);
      expect(takeHomeP1).toBeCloseTo(year.parent1.takeHome, 2);
      expect(niP1).toBeCloseTo(year.parent1.nationalInsurance, 2);
    }
  });

  it('shows the leave months as the tightest', () => {
    const result = calculateMaternityResults(
      inputs({ plan2: partnerPlan({ paternityLeaveWeeks: 0 }) })
    );
    expect(result.lowestMonthlyHouseholdNet).not.toBeNull();

    const lowest = result.monthlyCashflow.find(
      (m) => m.monthLabel === result.lowestMonthlyHouseholdNet!.monthLabel
    )!;
    expect(lowest.parent1.status).not.toBe('working');
    expect(lowest.householdNet).toBeLessThan(lowest.householdNetBaseline);
  });

  it('matches the baseline exactly in months before any leave starts', () => {
    // Cumulative PAYE means a month of unchanged pay before the leave begins
    // must deduct exactly what it would have anyway.
    const result = calculateMaternityResults(
      inputs({ birthDate: '2026-09-01', plan2: partnerPlan({ paternityLeaveWeeks: 0 }) })
    );

    const beforeLeave = result.monthlyCashflow.filter(
      (m) => m.parent1.status === 'working' && m.taxMonth <= 4 && m.taxYear === 2026
    );
    expect(beforeLeave.length).toBeGreaterThan(0);
    for (const month of beforeLeave) {
      expect(month.parent1.takeHome).toBeCloseTo(month.parent1.takeHomeBaseline, 2);
      expect(month.householdNet).toBeCloseTo(month.householdNetBaseline, 2);
    }
  });

  it('refunds tax in the months where pay drops', () => {
    const result = calculateMaternityResults(
      inputs({ birthDate: '2026-04-20', plan2: partnerPlan({ paternityLeaveWeeks: 0 }) })
    );
    // Deep into statutory-only pay, cumulative PAYE gives tax back
    const statutoryMonths = result.monthlyCashflow.filter(
      (m) => m.parent1.payLabel === 'SMP'
    );
    expect(statutoryMonths.length).toBeGreaterThan(0);
    expect(statutoryMonths.some((m) => m.parent1.incomeTax < 0)).toBe(true);
  });

  it('labels each month with the pay the parent is on', () => {
    const result = calculateMaternityResults(inputs());
    const labels = new Set(result.monthlyCashflow.map((m) => m.parent1.payLabel));
    expect(labels).toContain('SMP');
    expect(labels).toContain('Full pay');
  });
});

describe('national insurance across a leave year', () => {
  it('charges more than a naive annualised figure would', () => {
    const result = calculateMaternityResults(
      inputs({ plan2: partnerPlan({ paternityLeaveWeeks: 0 }) })
    );
    const year = result.taxYears[0];

    // Annualising the year's actual pay would wrongly hand back a full year of
    // NI relief on months where pay was below the threshold.
    const annualisedNI = (Math.max(0, year.parent1.grossPay - year.parent1.employeePension - 12570) * 0.08);
    expect(year.parent1.nationalInsurance).toBeGreaterThan(annualisedNI);
  });

  it('charges no NI in a full statutory-pay month', () => {
    const result = calculateMaternityResults(inputs());
    const smpMonths = result.monthlyCashflow.filter((m) => m.parent1.payLabel === 'SMP');
    expect(smpMonths.length).toBeGreaterThan(0);
    for (const month of smpMonths) {
      expect(month.parent1.nationalInsurance).toBe(0);
    }
  });
});

describe('pension during leave', () => {
  it('raises take-home and lowers the pot when contributions are paused', () => {
    const contributing = calculateMaternityResults(
      inputs({ plan1: birthPlan({ employeePensionPercentDuringLeave: 5 }) })
    );
    const paused = calculateMaternityResults(
      inputs({ plan1: birthPlan({ employeePensionPercentDuringLeave: 0 }) })
    );

    expect(paused.plan.employeePension).toBeLessThan(contributing.plan.employeePension);
    expect(paused.netDrop).toBeLessThan(contributing.netDrop);
    expect(paused.pensionForgone.total).toBeGreaterThan(contributing.pensionForgone.total);
    expect(paused.pensionForgone.potAtRetirementDifference).toBeGreaterThan(
      contributing.pensionForgone.potAtRetirementDifference
    );
  });

  it('keeps employer contributions on pre-leave salary through the paid weeks', () => {
    const maintained = getWeeklySchedule(
      inputs({ plan1: birthPlan({ employerMaintainsPension: true }) }),
      1
    );
    const notMaintained = getWeeklySchedule(
      inputs({ plan1: birthPlan({ employerMaintainsPension: false }) }),
      1
    );

    const weeklySalary = (52000 * 7) / 365;
    expect(maintained[10].employerPension).toBeCloseTo(weeklySalary * 0.03, 2);
    expect(notMaintained[10].employerPension).toBeCloseTo(RATE_2026 * 0.03, 2);
  });

  it('never contributes more than the pay actually received', () => {
    const schedule = getWeeklySchedule(
      inputs({ plan1: birthPlan({ employeePensionPercentDuringLeave: 120 }) }),
      1
    );
    for (const week of schedule) {
      expect(week.employeePension).toBeLessThanOrEqual(week.gross + 0.01);
      expect(week.gross - week.employeePension).toBeGreaterThanOrEqual(-0.01);
    }
  });

  it('deducts contributions from statutory pay, and flags the sacrifice caveat', () => {
    const schedule = getWeeklySchedule(
      inputs({ plan1: birthPlan({ employeePensionPercentDuringLeave: 5 }) }),
      1
    );
    // Week 10 is a flat-rate SMP week: 5% still comes out of it
    expect(schedule[10].employeePension).toBeCloseTo(RATE_2026 * 0.05, 2);

    const result = calculateMaternityResults(
      inputs({ plan1: birthPlan({ employeePensionPercentDuringLeave: 5 }) })
    );
    expect(result.warnings.some((w) => w.includes('salary sacrifice'))).toBe(true);
  });
});

describe('household benefits', () => {
  it('loses Tax-Free Childcare when only one parent is over £100k', () => {
    const result = calculateMaternityResults(
      inputs({
        parent1: profile({ grossSalary: 60000 }),
        parent2: profile({ label: 'Partner 2', grossSalary: 130000 }),
        plan1: birthPlan({ maternityLeaveWeeks: 0 }),
        plan2: partnerPlan({ paternityLeaveWeeks: 0 }),
      })
    );
    expect(result.taxYears[0].taxFreeChildcareBenefit).toBe(0);
  });

  it('regains Tax-Free Childcare when leave pulls the higher earner under £100k', () => {
    const result = calculateMaternityResults(
      inputs({
        parent1: profile({ grossSalary: 115000, employeePensionPercentage: 5 }),
        parent2: profile({ label: 'Partner 2', grossSalary: 40000 }),
        plan1: birthPlan({ maternityLeaveWeeks: 39 }),
        plan2: partnerPlan({ paternityLeaveWeeks: 0 }),
      })
    );

    const year = result.taxYears[0];
    expect(year.taxFreeChildcareBenefitBaseline).toBe(0);
    expect(year.taxFreeChildcareBenefit).toBe(2000);
    expect(result.insights.some((i) => i.includes('Tax-Free Childcare regained'))).toBe(true);
  });

  it('charges HICBC on the higher earner, not on each parent separately', () => {
    const result = calculateMaternityResults(
      inputs({
        parent1: profile({ grossSalary: 90000 }),
        parent2: profile({ label: 'Partner 2', grossSalary: 50000 }),
        plan1: birthPlan({ maternityLeaveWeeks: 0 }),
        plan2: partnerPlan({ paternityLeaveWeeks: 0 }),
      })
    );

    const year = result.taxYears[0];
    // Higher earner's ANI is 90,000 less 5% pension = 85,500, above the £80k
    // taper end, so the whole benefit is clawed back
    expect(year.higherAdjustedNetIncome).toBeCloseTo(85500, 0);
    expect(year.childBenefitCharge).toBeCloseTo(year.childBenefitReceived, 0);
    expect(year.netChildBenefit).toBeCloseTo(0, 0);
  });

  it('cuts the Child Benefit charge when leave lowers the higher earner\'s income', () => {
    const result = calculateMaternityResults(
      inputs({
        parent1: profile({ grossSalary: 75000 }),
        parent2: profile({ label: 'Partner 2', grossSalary: 30000 }),
        plan1: birthPlan({ maternityLeaveWeeks: 39 }),
        plan2: partnerPlan({ paternityLeaveWeeks: 0 }),
      })
    );

    const year = result.taxYears[0];
    expect(year.childBenefitCharge).toBeLessThan(year.childBenefitChargeBaseline);
    expect(result.insights.some((i) => i.includes('Child Benefit Charge falls'))).toBe(true);
  });

  it('pays no Child Benefit when the household does not claim', () => {
    const result = calculateMaternityResults(inputs({ claimsChildBenefit: false }));
    expect(result.taxYears[0].childBenefitReceived).toBe(0);
    expect(result.taxYears[0].childBenefitCharge).toBe(0);
  });
});

describe('part-time return to work', () => {
  it('carries the reduced salary past the end of leave', () => {
    const full = calculateMaternityResults(
      inputs({ plan2: partnerPlan({ paternityLeaveWeeks: 0 }) })
    );
    const partTime = calculateMaternityResults(
      inputs({
        plan1: birthPlan({ returnSalaryPercent: 60 }),
        plan2: partnerPlan({ paternityLeaveWeeks: 0 }),
      })
    );

    expect(partTime.grossDrop).toBeGreaterThan(full.grossDrop);
    expect(partTime.netDrop).toBeGreaterThan(full.netDrop);
  });
});

describe('eligibility', () => {
  it('warns when earnings are below the Lower Earnings Limit', () => {
    const result = calculateMaternityResults(
      inputs({ parent1: profile({ grossSalary: 5000 }) })
    );
    expect(result.warnings.some((w) => w.includes('Lower Earnings Limit'))).toBe(true);
  });
});
