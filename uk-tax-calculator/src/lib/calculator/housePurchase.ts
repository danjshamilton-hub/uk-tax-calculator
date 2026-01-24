// House Purchase Analysis with 3-Part Affordability Check

import type { HousePurchaseInputs, HousePurchaseResults } from '../../types/scenario';
import type { TaxRegion } from '../../data/taxRates2025';
import { calculateIncomeTax } from './incomeTax';
import { calculateNationalInsurance } from './nationalInsurance';
import { calculateLBTT } from './lbtt';
import { calculateStampDuty } from './stampDuty';
import { calculateMonthlyRepayment, calculateMaxMortgage } from './mortgageRepayment';
import { constants } from '../../data/constants';

/**
 * Calculate partner's take-home pay (simplified - no pension, car, etc.)
 */
function calculatePartnerTakeHome(partnerGrossSalary: number, region: TaxRegion): number {
  if (partnerGrossSalary === 0) return 0;

  const tax = calculateIncomeTax(partnerGrossSalary, region);
  const ni = calculateNationalInsurance(partnerGrossSalary);

  return partnerGrossSalary - tax - ni;
}

/**
 * Comprehensive house purchase analysis with 3-part affordability check
 */
export function analyzeHousePurchase(
  inputs: HousePurchaseInputs,
  yourAnnualTakeHome: number,
  region: TaxRegion
): HousePurchaseResults {
  // 1. Calculate partner's income
  const partnerAnnualTakeHome = calculatePartnerTakeHome(inputs.partnerGrossSalary, region);
  const combinedAnnualTakeHome = yourAnnualTakeHome + partnerAnnualTakeHome;
  const combinedMonthlyTakeHome = combinedAnnualTakeHome / 12;

  // 2. Calculate mortgage capacity (4.5x rule)
  const maxMortgageCapacity = calculateMaxMortgage(
    combinedAnnualTakeHome,
    constants.defaultMortgageMultiplier
  );

  // 3. Calculate mortgage - always capped at max capacity
  // The minimum deposit based on user's percentage
  const minimumDepositAmount = inputs.purchasePrice * (inputs.depositPercentage / 100);
  // Ideal mortgage if no capacity limit (based on valuation to avoid negative equity)
  const idealMortgage = inputs.houseValuation - minimumDepositAmount;
  // Mortgage is capped at max capacity - if limited, buyer needs more cash
  const mortgageNeeded = Math.min(Math.max(idealMortgage, 0), maxMortgageCapacity);
  // This is the deposit shown (minimum requested), but actual cash needed may be higher
  const depositAmount = minimumDepositAmount;

  // 4. Calculate monthly repayment (based on capped mortgage)
  const monthlyRepayment = calculateMonthlyRepayment(
    mortgageNeeded,
    inputs.mortgageInterestRate,
    inputs.mortgageTerm
  );

  // 5. Calculate 30% affordability
  const affordableMonthlyPayment =
    combinedMonthlyTakeHome * constants.monthlyAffordabilityThreshold;
  const monthlyRepaymentPercentage = (monthlyRepayment / combinedMonthlyTakeHome) * 100;
  const isMonthlyAffordable = monthlyRepayment <= affordableMonthlyPayment;

  // 6. Calculate property tax (LBTT or Stamp Duty)
  const lbttOrStampDuty =
    region === 'scotland'
      ? calculateLBTT(inputs.purchasePrice)
      : calculateStampDuty(inputs.purchasePrice);

  // 7. Calculate cash flow
  // Actual cash needed = purchase price - mortgage (which is capped at capacity)
  const actualCashForProperty = inputs.purchasePrice - mortgageNeeded;
  const houseSaleNetProceeds = inputs.currentHouseSalePrice - inputs.currentHouseMortgage;
  const totalCashRequired = actualCashForProperty + lbttOrStampDuty + inputs.movingCosts;
  const cashAvailable = inputs.currentBalance + houseSaleNetProceeds;
  const cashSurplusOrShortfall = cashAvailable - totalCashRequired;

  // 8. Perform affordability checks
  const affordabilityIssues: string[] = [];
  let canAfford = true;

  // Check 1: Info about mortgage being capped (not a failure, just info)
  const isMortgageCapped = idealMortgage > maxMortgageCapacity;
  if (isMortgageCapped) {
    const extraCashNeeded = idealMortgage - maxMortgageCapacity;
    affordabilityIssues.push(
      `Mortgage capped at £${maxMortgageCapacity.toLocaleString()} - need £${extraCashNeeded.toLocaleString()} extra cash`
    );
  }

  // Check 2: Cash position
  if (cashSurplusOrShortfall < 0) {
    affordabilityIssues.push(
      `Cash shortfall of £${Math.abs(cashSurplusOrShortfall).toLocaleString()}`
    );
    canAfford = false;
  }

  // Check 3: Monthly affordability (30% rule)
  if (!isMonthlyAffordable) {
    affordabilityIssues.push(
      `Monthly repayment (${monthlyRepaymentPercentage.toFixed(1)}%) exceeds 30% threshold`
    );
    canAfford = false;
  }

  // 9. Calculate max affordable price (simplified estimate)
  const maxAffordablePrice = calculateMaxAffordableHousePrice(
    maxMortgageCapacity,
    cashAvailable,
    inputs.depositPercentage,
    region,
    inputs.movingCosts
  );

  return {
    yourAnnualTakeHome,
    partnerAnnualTakeHome,
    combinedAnnualTakeHome,
    combinedMonthlyTakeHome,
    maxMortgageCapacity,
    depositAmount,
    mortgageNeeded,
    monthlyRepayment,
    affordableMonthlyPayment,
    monthlyRepaymentPercentage,
    isMonthlyAffordable,
    lbttOrStampDuty,
    totalCashRequired,
    houseSaleNetProceeds,
    cashAvailable,
    cashSurplusOrShortfall,
    canAfford,
    affordabilityIssues,
    maxAffordablePrice,
  };
}

/**
 * Calculate maximum affordable house price
 * This is a simplified calculation that works backwards from constraints
 */
function calculateMaxAffordableHousePrice(
  maxMortgageCapacity: number,
  cashAvailable: number,
  depositPercentage: number,
  region: TaxRegion,
  movingCosts: number
): number {
  // Start with a price estimate
  // Max price = (Mortgage + Deposit)
  // Where Deposit = Price × deposit%
  // So: Price = Mortgage / (1 - deposit%)

  const depositFraction = depositPercentage / 100;
  let estimatedPrice = maxMortgageCapacity / (1 - depositFraction);

  // Iteratively adjust for LBTT/Stamp Duty and moving costs
  for (let i = 0; i < 5; i++) {
    const estimatedDeposit = estimatedPrice * depositFraction;
    const estimatedTax =
      region === 'scotland' ? calculateLBTT(estimatedPrice) : calculateStampDuty(estimatedPrice);
    const cashNeeded = estimatedDeposit + estimatedTax + movingCosts;

    if (cashNeeded > cashAvailable) {
      // Reduce price
      estimatedPrice = estimatedPrice * 0.95;
    } else {
      break;
    }
  }

  return Math.round(estimatedPrice);
}
