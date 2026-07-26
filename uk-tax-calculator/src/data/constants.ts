// Application Constants and Defaults

export const constants = {
  // Mortgage
  defaultMortgageMultiplier: 4.5,
  defaultMortgageInterestRate: 5.0, // percentage
  defaultMortgageTerm: 25, // years
  defaultDepositPercentage: 15,
  monthlyAffordabilityThreshold: 0.3, // 30% of monthly take-home

  // Investment & Pension
  defaultInvestmentReturn: 5.0, // annual percentage

  // House Purchase
  defaultMovingCosts: 2000,

  // UI
  minDepositPercentage: 5,
  maxDepositPercentage: 25,

  // Projections
  defaultProjectionYears: 5,
  minProjectionYears: 1,
  maxProjectionYears: 10,
  defaultSalaryIncrease: 3.0, // annual percentage
  defaultStartingTaxYear: 2026,

  // Budget
  defaultBudgetProjectionYears: 3,
  minBudgetProjectionYears: 1,
  maxBudgetProjectionYears: 5,
  defaultJointContributionPercent: 70,
  defaultSavingsGrowthRate: 5.0, // annual % for investment growth
};
