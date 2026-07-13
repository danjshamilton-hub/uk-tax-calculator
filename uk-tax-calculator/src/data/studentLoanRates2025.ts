// Student Loan Repayment Thresholds and Rates for 2025/26

export type StudentLoanPlan = 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5';

export interface StudentLoanConfig {
  threshold: number; // annual repayment threshold
  rate: number; // percentage of income above threshold
  label: string;
}

export const studentLoanPlans: Record<Exclude<StudentLoanPlan, 'none'>, StudentLoanConfig> = {
  plan1: { threshold: 26065, rate: 9, label: 'Plan 1' },
  plan2: { threshold: 28470, rate: 9, label: 'Plan 2' },
  plan4: { threshold: 32745, rate: 9, label: 'Plan 4 (Scotland)' },
  plan5: { threshold: 25000, rate: 9, label: 'Plan 5' },
};

// Postgraduate loan is repaid concurrently with any undergraduate plan
export const postgradLoanConfig: StudentLoanConfig = {
  threshold: 21000,
  rate: 6,
  label: 'Postgraduate',
};
