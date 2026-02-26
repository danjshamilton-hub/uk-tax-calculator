// Budget Tab Type Definitions

export type ExpenseCategory = 'essential' | 'nice-to-have' | 'savings';
export type PaymentSource = 'joint' | 'partner1' | 'partner2';
export type ExpenseFrequency = 'monthly' | 'annual';

/**
 * A single budget expense or savings item
 */
export interface BudgetExpense {
  id: string;
  description: string;
  amount: number;
  frequency: ExpenseFrequency;
  category: ExpenseCategory;
  paymentSource: PaymentSource;
}

/**
 * Input configuration for budget calculations
 */
export interface BudgetInputs {
  partner1MonthlyTakeHome: number;
  partner2MonthlyTakeHome: number;
  jointContribution1: number; // Monthly amount P1 puts into joint account
  jointContribution2: number; // Monthly amount P2 puts into joint account
  mortgageMonthly: number;
  mortgageOverride: number | null; // Override the mortgage from House tab
  expenses: BudgetExpense[];
  savingsGrowthRate: number; // Annual % for investment growth projections
}

/**
 * Calculated budget summary showing balances for each account
 */
export interface BudgetSummary {
  // Joint account
  jointIncome: number;
  jointExpenses: number; // Non-savings expenses paid from joint
  jointSavings: number; // Savings contributions from joint
  jointMortgage: number;
  jointBalance: number; // Leftover after all outgoings

  // Partner 1 personal account
  partner1Remaining: number; // Take-home after joint contribution
  partner1Expenses: number;
  partner1Savings: number;
  partner1Balance: number;

  // Partner 2 personal account
  partner2Remaining: number;
  partner2Expenses: number;
  partner2Savings: number;
  partner2Balance: number;

  // Totals
  totalMonthlySavings: number; // All savings contributions combined
  totalAnnualSavings: number;
  totalMonthlyLeftover: number; // Unallocated balance from all accounts
  essentialExpensesTotal: number;
  niceToHaveExpensesTotal: number;
}

/**
 * A single year's projection results
 */
export interface BudgetProjectionYear {
  year: number;

  // Savings pot accumulation (with compound growth)
  savingsContributed: number; // That year's savings contributions
  savingsGrowth: number; // Investment growth on pot
  savingsPotTotal: number; // Running total of savings pot

  // Mortgage tracking
  mortgagePaidThisYear: number;
  mortgagePrincipalRemaining: number;

  // Net position
  netWorth: number; // Savings pot - mortgage remaining
}
