// 2025/26 tax year rates (6 April 2025 to 5 April 2026).
// Retained so that leave and projections which reach back into 2025/26 use the
// rates that actually applied.

import type { TaxYearRates } from './types';

export const taxYear2025: TaxYearRates = {
  taxYear: 2025,
  isProjected: false,

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
      { min: 12571, max: 15397, rate: 19 }, // Starter rate
      { min: 15398, max: 27491, rate: 20 }, // Basic rate
      { min: 27492, max: 43662, rate: 21 }, // Intermediate rate
      { min: 43663, max: 75000, rate: 42 }, // Higher rate
      { min: 75001, max: 125140, rate: 45 }, // Advanced rate
      { min: 125140, max: null, rate: 48 }, // Top rate
    ],
  },

  nationalInsuranceBands: [
    { min: 0, max: 12570, rate: 0 }, // Below primary threshold
    { min: 12570, max: 50270, rate: 8 }, // Standard rate
    { min: 50270, max: null, rate: 2 }, // Above upper earnings limit
  ],
  lowerEarningsLimitWeekly: 125,

  studentLoanPlans: {
    plan1: { threshold: 26065, rate: 9, label: 'Plan 1' },
    plan2: { threshold: 28470, rate: 9, label: 'Plan 2' },
    plan4: { threshold: 32745, rate: 9, label: 'Plan 4 (Scotland)' },
    plan5: { threshold: 25000, rate: 9, label: 'Plan 5' },
  },
  postgradLoanConfig: { threshold: 21000, rate: 6, label: 'Postgraduate' },

  benefitsThresholds: {
    childBenefit: {
      taperStart: 60000,
      taperEnd: 80000,
      annualBenefitFirstChild: 1354.6, // £26.05 per week
      annualBenefitAdditionalChild: 897, // £17.25 per week
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
    weeklyRate: 187.18,
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
