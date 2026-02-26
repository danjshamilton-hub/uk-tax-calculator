// Budget Calculation Engine

import type {
  BudgetExpense,
  BudgetInputs,
  BudgetSummary,
  BudgetProjectionYear,
} from '../../types/budget';

/**
 * Generate a unique ID for a new expense
 */
export function generateExpenseId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert an expense to its monthly equivalent
 */
export function calculateMonthlyAmount(expense: BudgetExpense): number {
  if (expense.frequency === 'annual') {
    return expense.amount / 12;
  }
  return expense.amount;
}

/**
 * Calculate the budget summary showing balances for each account.
 * Uses a single-pass loop over expenses for efficiency.
 */
export function calculateBudgetSummary(inputs: BudgetInputs): BudgetSummary {
  const effectiveMortgage = inputs.mortgageOverride ?? inputs.mortgageMonthly;

  // Accumulate all totals in a single pass
  let jointExpenses = 0, jointSavings = 0;
  let partner1Expenses = 0, partner1Savings = 0;
  let partner2Expenses = 0, partner2Savings = 0;
  let essentialExpensesTotal = 0, niceToHaveExpensesTotal = 0;

  for (const expense of inputs.expenses) {
    const monthly = calculateMonthlyAmount(expense);
    const isSavings = expense.category === 'savings';

    // Accumulate by payment source
    if (expense.paymentSource === 'joint') {
      if (isSavings) jointSavings += monthly;
      else jointExpenses += monthly;
    } else if (expense.paymentSource === 'partner1') {
      if (isSavings) partner1Savings += monthly;
      else partner1Expenses += monthly;
    } else {
      if (isSavings) partner2Savings += monthly;
      else partner2Expenses += monthly;
    }

    // Accumulate by category
    if (expense.category === 'essential') essentialExpensesTotal += monthly;
    else if (expense.category === 'nice-to-have') niceToHaveExpensesTotal += monthly;
  }

  // Joint account
  const jointIncome = inputs.jointContribution1 + inputs.jointContribution2;
  const jointBalance = jointIncome - jointExpenses - jointSavings - effectiveMortgage;

  // Partner 1 personal account
  const partner1Remaining = inputs.partner1MonthlyTakeHome - inputs.jointContribution1;
  const partner1Balance = partner1Remaining - partner1Expenses - partner1Savings;

  // Partner 2 personal account
  const partner2Remaining = inputs.partner2MonthlyTakeHome - inputs.jointContribution2;
  const partner2Balance = partner2Remaining - partner2Expenses - partner2Savings;

  // Totals
  const totalMonthlySavings = jointSavings + partner1Savings + partner2Savings;
  const totalMonthlyLeftover = jointBalance + partner1Balance + partner2Balance;

  return {
    jointIncome,
    jointExpenses,
    jointSavings,
    jointMortgage: effectiveMortgage,
    jointBalance,
    partner1Remaining,
    partner1Expenses,
    partner1Savings,
    partner1Balance,
    partner2Remaining,
    partner2Expenses,
    partner2Savings,
    partner2Balance,
    totalMonthlySavings,
    totalAnnualSavings: totalMonthlySavings * 12,
    totalMonthlyLeftover,
    essentialExpensesTotal,
    niceToHaveExpensesTotal,
  };
}

/**
 * Calculate the remaining mortgage principal after a given number of months
 * using standard amortization formula
 */
function calculateRemainingPrincipal(
  principal: number,
  annualRate: number,
  termYears: number,
  monthsPaid: number
): number {
  if (principal === 0 || termYears === 0) return 0;
  if (annualRate === 0) {
    // Simple linear reduction for interest-free
    const monthlyPayment = principal / (termYears * 12);
    return Math.max(0, principal - monthlyPayment * monthsPaid);
  }

  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = termYears * 12;

  // Monthly payment formula
  const monthlyPayment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
    (Math.pow(1 + monthlyRate, totalPayments) - 1);

  // Remaining balance formula after n payments
  const remainingBalance =
    principal * Math.pow(1 + monthlyRate, monthsPaid) -
    (monthlyPayment * (Math.pow(1 + monthlyRate, monthsPaid) - 1)) / monthlyRate;

  return Math.max(0, remainingBalance);
}

/**
 * Calculate budget projections over multiple years showing savings growth and mortgage payoff
 */
export function calculateBudgetProjection(
  summary: BudgetSummary,
  years: number,
  savingsGrowthRate: number,
  mortgagePrincipal: number,
  mortgageRate: number,
  mortgageTerm: number
): BudgetProjectionYear[] {
  const projections: BudgetProjectionYear[] = [];
  const annualSavings = summary.totalAnnualSavings;

  let previousPot = 0;

  for (let year = 1; year <= years; year++) {
    // Savings: contributions get half-year growth on average
    const savingsContributed = annualSavings;
    const growthOnExisting = previousPot * (savingsGrowthRate / 100);
    const growthOnNew = savingsContributed * (savingsGrowthRate / 100 / 2); // Half year average
    const savingsGrowth = growthOnExisting + growthOnNew;
    const savingsPotTotal = previousPot + savingsContributed + savingsGrowth;

    // Mortgage: calculate remaining principal after this year
    const monthsPaid = year * 12;
    const mortgagePrincipalRemaining = calculateRemainingPrincipal(
      mortgagePrincipal,
      mortgageRate,
      mortgageTerm,
      monthsPaid
    );

    // Calculate how much principal was paid this year
    const previousMortgageBalance =
      year === 1
        ? mortgagePrincipal
        : calculateRemainingPrincipal(mortgagePrincipal, mortgageRate, mortgageTerm, (year - 1) * 12);
    const mortgagePaidThisYear = previousMortgageBalance - mortgagePrincipalRemaining;

    // Net worth
    const netWorth = savingsPotTotal - mortgagePrincipalRemaining;

    projections.push({
      year,
      savingsContributed,
      savingsGrowth: Math.round(savingsGrowth),
      savingsPotTotal: Math.round(savingsPotTotal),
      mortgagePaidThisYear: Math.round(mortgagePaidThisYear),
      mortgagePrincipalRemaining: Math.round(mortgagePrincipalRemaining),
      netWorth: Math.round(netWorth),
    });

    previousPot = savingsPotTotal;
  }

  return projections;
}

/**
 * Create a default expense item
 */
export function createDefaultExpense(category: 'essential' | 'nice-to-have' | 'savings' = 'essential'): BudgetExpense {
  return {
    id: generateExpenseId(),
    description: category === 'savings' ? '' : '',
    amount: 0,
    frequency: 'monthly',
    category,
    paymentSource: 'joint',
  };
}
