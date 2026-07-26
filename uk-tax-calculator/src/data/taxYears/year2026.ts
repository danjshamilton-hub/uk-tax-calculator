// 2026/27 tax year rates (6 April 2026 to 5 April 2027).
//
// Sources:
//  - rUK income tax: thresholds frozen to at least 2027/28 (Autumn Budget 2025)
//  - Scottish income tax: Scottish Budget Jan 2026 widened the starter and basic
//    bands; higher/advanced/top thresholds held at £43,662 / £75,000 / £125,140
//  - NICs: employee rates and thresholds unchanged; LEL £129/week (£6,708/year)
//  - Student loans: Plan 1/2/4 thresholds uprated, Plan 5 and PGL frozen
//  - Child Benefit: £27.05/week eldest, £17.90/week each additional
//  - Statutory parental pay: standard weekly rate £194.32

import type { TaxYearRates } from './types';

export const taxYear2026: TaxYearRates = {
  taxYear: 2026,
  isProjected: false,

  // Unchanged from 2025/26 - thresholds frozen
  england: {
    personalAllowance: 12570,
    personalAllowanceTaperStart: 100000,
    personalAllowanceTaperEnd: 125140,
    bands: [
      { min: 0, max: 12570, rate: 0 }, // Personal allowance
      { min: 12571, max: 50270, rate: 20 }, // Basic rate
      { min: 50271, max: 125140, rate: 40 }, // Higher rate
      { min: 125140, max: null, rate: 45 }, // Additional rate
    ],
  },

  scotland: {
    personalAllowance: 12570,
    personalAllowanceTaperStart: 100000,
    personalAllowanceTaperEnd: 125140,
    bands: [
      { min: 0, max: 12570, rate: 0 }, // Personal allowance
      { min: 12571, max: 16537, rate: 19 }, // Starter rate (was 15,397)
      { min: 16538, max: 29526, rate: 20 }, // Basic rate (was 27,491)
      { min: 29527, max: 43662, rate: 21 }, // Intermediate rate
      { min: 43663, max: 75000, rate: 42 }, // Higher rate
      { min: 75001, max: 125140, rate: 45 }, // Advanced rate
      { min: 125140, max: null, rate: 48 }, // Top rate
    ],
  },

  // Unchanged from 2025/26
  nationalInsuranceBands: [
    { min: 0, max: 12570, rate: 0 }, // Below primary threshold
    { min: 12570, max: 50270, rate: 8 }, // Standard rate
    { min: 50270, max: null, rate: 2 }, // Above upper earnings limit
  ],
  lowerEarningsLimitWeekly: 129, // £6,708/year

  studentLoanPlans: {
    plan1: { threshold: 26900, rate: 9, label: 'Plan 1' },
    plan2: { threshold: 29385, rate: 9, label: 'Plan 2' },
    plan4: { threshold: 33795, rate: 9, label: 'Plan 4 (Scotland)' },
    plan5: { threshold: 25000, rate: 9, label: 'Plan 5' }, // frozen by design
  },
  postgradLoanConfig: { threshold: 21000, rate: 6, label: 'Postgraduate' }, // frozen

  benefitsThresholds: {
    childBenefit: {
      taperStart: 60000, // HICBC thresholds unchanged
      taperEnd: 80000,
      annualBenefitFirstChild: 1406.6, // £27.05 per week
      annualBenefitAdditionalChild: 930.8, // £17.90 per week
    },
    taxFreeChildcare: {
      threshold: 100000,
      governmentContributionPerChild: 2000,
    },
    freeChildcare30Hours: {
      threshold: 100000,
      englandOnly: true,
    },
  },

  statutoryPay: {
    weeklyRate: 194.32,
    maternity: {
      maxLeaveWeeks: 52,
      maxPaidWeeks: 39,
      higherRateWeeks: 6,
      higherRatePercent: 90,
      flatRateWeeks: 33,
      compulsoryLeaveWeeks: 2,
    },
    paternity: { leaveWeeks: 2, paidWeeks: 2 },
    shared: { maxLeaveWeeks: 50, maxPaidWeeks: 37 },
  },
};
