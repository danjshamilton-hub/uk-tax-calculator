// Mortgage Repayment Calculator (P&I Formula)

/**
 * Calculate monthly mortgage repayment using standard P&I formula
 * Monthly Payment = P × [r(1+r)^n] / [(1+r)^n - 1]
 *
 * @param principal - Loan amount
 * @param annualInterestRate - Annual interest rate (as percentage, e.g., 5.0)
 * @param termYears - Mortgage term in years
 * @returns Monthly repayment amount
 */
export function calculateMonthlyRepayment(
  principal: number,
  annualInterestRate: number,
  termYears: number
): number {
  if (principal === 0 || termYears === 0) return 0;
  if (annualInterestRate === 0) {
    // Interest-free loan
    return principal / (termYears * 12);
  }

  const monthlyRate = annualInterestRate / 100 / 12;
  const numberOfPayments = termYears * 12;

  const monthlyPayment =
    principal *
    (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

  return Math.round(monthlyPayment * 100) / 100;
}

/**
 * Calculate maximum mortgage capacity based on income
 */
export function calculateMaxMortgage(annualTakeHome: number, multiplier: number = 4.5): number {
  return Math.round(annualTakeHome * multiplier * 100) / 100;
}
