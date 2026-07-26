import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TAX_YEAR,
  getRatesForTaxYear,
  getTaxConfig,
  statutoryWeeklyRate,
  formatTaxYear,
} from './index';
import { calculateIncomeTax } from '../../lib/calculator/incomeTax';
import { calculateNationalInsurance, calculateNIForPeriod } from '../../lib/calculator/nationalInsurance';
import { calculateStudentLoanRepayment } from '../../lib/calculator/studentLoan';
import { calculateAnnualChildBenefit } from '../../lib/calculator/benefits';

describe('tax year registry', () => {
  it('defaults to 2026/27', () => {
    expect(DEFAULT_TAX_YEAR).toBe(2026);
    expect(formatTaxYear(2026)).toBe('2026/27');
  });

  it('marks 2025/26 and 2026/27 as published, 2027/28 as projected', () => {
    expect(getRatesForTaxYear(2025).isProjected).toBe(false);
    expect(getRatesForTaxYear(2026).isProjected).toBe(false);
    expect(getRatesForTaxYear(2027).isProjected).toBe(true);
  });

  it('clamps unknown years to the nearest known year and flags them projected', () => {
    const future = getRatesForTaxYear(2035);
    expect(future.isProjected).toBe(true);
    expect(future.taxYear).toBe(2035);
    expect(future.scotland.bands).toEqual(getRatesForTaxYear(2027).scotland.bands);

    const past = getRatesForTaxYear(2019);
    expect(past.isProjected).toBe(true);
    expect(past.scotland.bands).toEqual(getRatesForTaxYear(2025).scotland.bands);
  });
});

describe('England/Wales/NI income tax 2026/27', () => {
  // Thresholds are frozen, so 2026/27 must produce identical figures to 2025/26.
  it.each([20000, 45000, 60000, 99000, 130000])(
    'is unchanged from 2025/26 at £%s',
    (salary) => {
      expect(calculateIncomeTax(salary, 'england', 2026)).toBe(
        calculateIncomeTax(salary, 'england', 2025)
      );
    }
  );

  it('keeps the personal allowance taper at £100k-£125,140', () => {
    const config = getTaxConfig('england', 2026);
    expect(config.personalAllowance).toBe(12570);
    expect(config.personalAllowanceTaperStart).toBe(100000);
    expect(config.personalAllowanceTaperEnd).toBe(125140);
  });

  it('taxes £50,000 at the basic rate throughout', () => {
    // (50,000 - 12,570) x 20%
    expect(calculateIncomeTax(50000, 'england', 2026)).toBeCloseTo(7486, 2);
  });
});

describe('Scottish income tax 2026/27', () => {
  it('widens the starter and basic bands versus 2025/26', () => {
    const bands2026 = getTaxConfig('scotland', 2026).bands;
    expect(bands2026.find((b) => b.rate === 19)?.max).toBe(16537);
    expect(bands2026.find((b) => b.rate === 20)?.max).toBe(29526);
    expect(bands2026.find((b) => b.rate === 21)?.max).toBe(43662);
  });

  it('holds the higher, advanced and top rate thresholds', () => {
    const bands2026 = getTaxConfig('scotland', 2026).bands;
    const bands2025 = getTaxConfig('scotland', 2025).bands;
    expect(bands2026.find((b) => b.rate === 42)?.max).toBe(bands2025.find((b) => b.rate === 42)?.max);
    expect(bands2026.find((b) => b.rate === 45)?.max).toBe(bands2025.find((b) => b.rate === 45)?.max);
    expect(bands2026.find((b) => b.rate === 48)?.min).toBe(125140);
  });

  it('charges a £30,000 earner less than under 2025/26 bands', () => {
    const tax2026 = calculateIncomeTax(30000, 'scotland', 2026);
    const tax2025 = calculateIncomeTax(30000, 'scotland', 2025);
    expect(tax2026).toBeLessThan(tax2025);
  });

  it('taxes £30,000 correctly across the widened bands', () => {
    // 19% on 12,570->16,537 (3,967), 20% on 16,537->29,526 (12,989),
    // 21% on 29,526->30,000 (474)
    const expected = 3967 * 0.19 + 12989 * 0.2 + 474 * 0.21;
    expect(calculateIncomeTax(30000, 'scotland', 2026)).toBeCloseTo(expected, 0);
  });

  it('still taxes high earners more than England', () => {
    expect(calculateIncomeTax(80000, 'scotland', 2026)).toBeGreaterThan(
      calculateIncomeTax(80000, 'england', 2026)
    );
  });
});

describe('National Insurance 2026/27', () => {
  it('is unchanged from 2025/26', () => {
    expect(calculateNationalInsurance(50000, 2026)).toBe(calculateNationalInsurance(50000, 2025));
  });

  it('charges 8% between the primary threshold and upper earnings limit', () => {
    expect(calculateNationalInsurance(50270, 2026)).toBeCloseTo((50270 - 12570) * 0.08, 2);
  });

  it('charges 2% above the upper earnings limit', () => {
    const expected = (50270 - 12570) * 0.08 + (70000 - 50270) * 0.02;
    expect(calculateNationalInsurance(70000, 2026)).toBeCloseTo(expected, 2);
  });

  it('sets the weekly lower earnings limit to £129', () => {
    expect(getRatesForTaxYear(2026).lowerEarningsLimitWeekly).toBe(129);
  });
});

describe('per-period National Insurance', () => {
  it('matches the annual basis when pay is even across the year', () => {
    const annual = calculateNationalInsurance(48000, 2026);
    const monthly = calculateNIForPeriod(48000 / 12, 12, 2026) * 12;
    expect(monthly).toBeCloseTo(annual, 0);
  });

  it('charges more than the annual basis when pay is concentrated in half a year', () => {
    // £50k salary, paid for 6 months then nothing (an unpaid leave year).
    const monthlyPay = 50000 / 12;
    const perPeriod = calculateNIForPeriod(monthlyPay, 12, 2026) * 6;
    const annualised = calculateNationalInsurance(50000 / 2, 2026);

    expect(perPeriod).toBeGreaterThan(annualised);
    // The annual basis wrongly hands back a full personal-threshold's worth of relief
    expect(perPeriod - annualised).toBeGreaterThan(400);
  });

  it('charges nothing on a statutory-pay month below the monthly threshold', () => {
    const smpMonth = (194.32 * 52) / 12; // ~£842/month
    expect(calculateNIForPeriod(smpMonth, 12, 2026)).toBe(0);
  });
});

describe('student loans 2026/27', () => {
  it('uses the uprated Plan 1, 2 and 4 thresholds', () => {
    const plans = getRatesForTaxYear(2026).studentLoanPlans;
    expect(plans.plan1.threshold).toBe(26900);
    expect(plans.plan2.threshold).toBe(29385);
    expect(plans.plan4.threshold).toBe(33795);
  });

  it('keeps Plan 5 and postgraduate frozen', () => {
    const rates = getRatesForTaxYear(2026);
    expect(rates.studentLoanPlans.plan5.threshold).toBe(25000);
    expect(rates.postgradLoanConfig.threshold).toBe(21000);
    expect(rates.postgradLoanConfig.rate).toBe(6);
  });

  it('repays less on Plan 2 than in 2025/26 at the same salary', () => {
    expect(calculateStudentLoanRepayment(40000, 'plan2', 2026)).toBeLessThan(
      calculateStudentLoanRepayment(40000, 'plan2', 2025)
    );
    expect(calculateStudentLoanRepayment(40000, 'plan2', 2026)).toBeCloseTo(
      (40000 - 29385) * 0.09,
      2
    );
  });
});

describe('benefits 2026/27', () => {
  it('uprates Child Benefit to £27.05 / £17.90 a week', () => {
    const cb = getRatesForTaxYear(2026).benefitsThresholds.childBenefit;
    expect(cb.annualBenefitFirstChild).toBeCloseTo(27.05 * 52, 1);
    expect(cb.annualBenefitAdditionalChild).toBeCloseTo(17.9 * 52, 1);
  });

  it('holds the HICBC taper at £60k-£80k', () => {
    const cb = getRatesForTaxYear(2026).benefitsThresholds.childBenefit;
    expect(cb.taperStart).toBe(60000);
    expect(cb.taperEnd).toBe(80000);
  });

  it('pays more Child Benefit for two children than in 2025/26', () => {
    expect(calculateAnnualChildBenefit(2, 2026)).toBeGreaterThan(
      calculateAnnualChildBenefit(2, 2025)
    );
  });

  it('holds Tax-Free Childcare at £2,000 per child up to £100k', () => {
    const tfc = getRatesForTaxYear(2026).benefitsThresholds.taxFreeChildcare;
    expect(tfc.threshold).toBe(100000);
    expect(tfc.governmentContributionPerChild).toBe(2000);
  });
});

describe('statutory parental pay rates', () => {
  it('uprates the weekly rate to £194.32 for 2026/27', () => {
    expect(statutoryWeeklyRate(2025)).toBe(187.18);
    expect(statutoryWeeklyRate(2026)).toBe(194.32);
  });

  it('describes the maternity schedule as 6 weeks at 90% then 33 flat', () => {
    const { maternity } = getRatesForTaxYear(2026).statutoryPay;
    expect(maternity.higherRateWeeks).toBe(6);
    expect(maternity.higherRatePercent).toBe(90);
    expect(maternity.flatRateWeeks).toBe(33);
    expect(maternity.higherRateWeeks + maternity.flatRateWeeks).toBe(maternity.maxPaidWeeks);
    expect(maternity.maxLeaveWeeks).toBe(52);
  });

  it('sizes the shared pots as the leftovers after compulsory maternity leave', () => {
    const { maternity, shared } = getRatesForTaxYear(2026).statutoryPay;
    expect(shared.maxLeaveWeeks).toBe(maternity.maxLeaveWeeks - maternity.compulsoryLeaveWeeks);
    expect(shared.maxPaidWeeks).toBe(maternity.maxPaidWeeks - maternity.compulsoryLeaveWeeks);
    expect(shared.maxLeaveWeeks).toBe(50);
    expect(shared.maxPaidWeeks).toBe(37);
  });
});
