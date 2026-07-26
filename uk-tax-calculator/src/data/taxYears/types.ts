// Shared shapes for per-tax-year rate data.
// One TaxYearRates object fully describes a UK tax year (6 April to 5 April).

export interface TaxBand {
  min: number;
  max: number | null; // null for highest band
  rate: number; // percentage
}

export interface TaxConfig {
  personalAllowance: number;
  personalAllowanceTaperStart: number;
  personalAllowanceTaperEnd: number;
  bands: TaxBand[];
}

export interface NIBand {
  min: number;
  max: number | null;
  rate: number; // percentage
}

export type TaxRegion = 'england' | 'scotland';

export type StudentLoanPlan = 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5';

export interface StudentLoanConfig {
  threshold: number; // annual repayment threshold
  rate: number; // percentage of income above threshold
  label: string;
}

export interface BenefitsThresholds {
  childBenefit: {
    taperStart: number;
    taperEnd: number;
    annualBenefitFirstChild: number;
    annualBenefitAdditionalChild: number;
  };
  taxFreeChildcare: {
    threshold: number;
    governmentContributionPerChild: number;
  };
  freeChildcare30Hours: {
    threshold: number;
    englandOnly: boolean;
  };
}

/**
 * Statutory parental pay. The week counts are set in primary legislation and do
 * not change year to year; only weeklyRate is uprated each April.
 */
export interface StatutoryPayConfig {
  weeklyRate: number; // standard weekly rate for SMP (weeks 7-39), SPP and ShPP

  maternity: {
    maxLeaveWeeks: number; // 52 - total maternity leave
    maxPaidWeeks: number; // 39 - only 39 of the 52 are ever paid
    higherRateWeeks: number; // 6 - paid at 90% of AWE, uncapped
    higherRatePercent: number; // 90
    flatRateWeeks: number; // 33 - min(weeklyRate, 90% AWE)
    compulsoryLeaveWeeks: number; // 2 - cannot be given up or shared
  };

  /** Statutory paternity leave is a separate entitlement, not drawn from the shared pot */
  paternity: {
    leaveWeeks: number; // 2
    paidWeeks: number; // 2
  };

  /**
   * Shared Parental Leave/Pay. Created by the mother curtailing maternity leave,
   * so the two pots are what remains of the 52 leave weeks and 39 paid weeks
   * after the 2 compulsory weeks.
   */
  shared: {
    maxLeaveWeeks: number; // 50 = 52 - 2
    maxPaidWeeks: number; // 37 = 39 - 2
  };
}

export interface TaxYearRates {
  /** Start year of the tax year: 2026 means 2026/27 */
  taxYear: number;
  /** True when these rates are carried forward rather than announced */
  isProjected: boolean;

  england: TaxConfig;
  scotland: TaxConfig;

  nationalInsuranceBands: NIBand[];
  /** Weekly Lower Earnings Limit - the earnings test for statutory parental pay */
  lowerEarningsLimitWeekly: number;

  studentLoanPlans: Record<Exclude<StudentLoanPlan, 'none'>, StudentLoanConfig>;
  postgradLoanConfig: StudentLoanConfig;

  benefitsThresholds: BenefitsThresholds;
  statutoryPay: StatutoryPayConfig;
}
