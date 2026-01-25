// Main Calculation Orchestrator
// Follows the precise calculation order from the plan

import type { ScenarioInputs, CalculationResults } from '../../types/scenario';
import { calculateEmployeePension, calculateEmployerPension, calculatePensionPot, calculatePensionAtRetirement } from './pension';
import { calculateBIKTaxableAmount } from './companyCard';
import { calculateIncomeTax } from './incomeTax';
export { getTaxBreakdown } from './incomeTax';
export type { TaxBracketBreakdown } from './incomeTax';
import { calculateNationalInsurance } from './nationalInsurance';
import { calculateAdjustedNetIncome, calculateTotalBenefitsImpact } from './benefits';
import { calculateMaxMortgage } from './mortgageRepayment';
import { analyzeHousePurchase } from './housePurchase';
import { getTaxConfig } from '../../data/taxRates2025';

/**
 * Generate cliff edge warnings based on income and circumstances
 */
function generateCliffEdgeWarnings(inputs: ScenarioInputs, results: CalculationResults): string[] {
  const warnings: string[] = [];
  const ani = results.adjustedNetIncome;

  // Child Benefit taper zone (£60k-£80k)
  if (inputs.hasChildren && ani >= 55000 && ani < 60000) {
    warnings.push(`⚠️ Approaching Child Benefit taper (starts at £60k ANI). Current ANI: £${ani.toLocaleString()}`);
  } else if (inputs.hasChildren && ani >= 60000 && ani < 80000) {
    warnings.push(`⚠️ In Child Benefit taper zone (£60k-£80k). Effective marginal rate ~61%. Current ANI: £${ani.toLocaleString()}`);
  }

  // £100k threshold (multiple cliff edges)
  if (ani >= 95000 && ani < 100000) {
    const impacts: string[] = [];
    if (inputs.hasChildren) {
      impacts.push('Tax-Free Childcare (£2k/child)');
      if (inputs.taxRegion === 'england') {
        impacts.push('30 Hours Free Childcare');
      }
    }
    impacts.push('Personal Allowance starts tapering');
    warnings.push(`⚠️ Approaching £100k threshold. Will lose: ${impacts.join(', ')}`);
  } else if (ani >= 100000 && ani < 125140) {
    warnings.push(`⚠️ Personal Allowance taper zone (£100k-£125,140). Effective marginal rate ~60%. Current ANI: £${ani.toLocaleString()}`);
  }

  // Suggestions
  if (ani >= 60000 && ani < 80000 && inputs.hasChildren) {
    const targetReduction = ani - 59999;
    const pensionIncrease = Math.ceil((targetReduction / results.grossSalary) * 100);
    warnings.push(`💡 Consider increasing pension by ${pensionIncrease}% to reduce ANI below £60k`);
  }

  if (ani >= 100000 && ani < 125140) {
    const targetReduction = ani - 99999;
    const pensionIncrease = Math.ceil((targetReduction / results.grossSalary) * 100);
    warnings.push(`💡 Consider increasing pension by ${pensionIncrease}% to reduce ANI below £100k`);
  }

  return warnings;
}

/**
 * Main calculation function following the precise order from the plan
 */
export function calculateAllResults(inputs: ScenarioInputs): CalculationResults {
  // 1. Start with original gross salary
  const grossSalary = inputs.grossSalary;

  // 2-3. Employee and employer pension (CRITICAL: on FULL gross BEFORE car sacrifice)
  const employeePension = calculateEmployeePension(grossSalary, inputs.employeePensionPercentage);
  const employerPension = calculateEmployerPension(grossSalary, inputs.employerPensionPercentage);

  // 4. Car salary sacrifice applied AFTER pension calculations
  const carSalarySacrifice = inputs.hasCompanyCar ? inputs.carSalarySacrifice : 0;

  // 5. Gross after deductions
  const grossAfterDeductions = grossSalary - employeePension - carSalarySacrifice;

  // 6. BIK taxable amount
  const bikTaxableAmount = inputs.hasCompanyCar
    ? calculateBIKTaxableAmount(inputs.carP11DValue, inputs.carBIKPercentage)
    : 0;

  // 7. Taxable income
  const taxableIncome = grossAfterDeductions + bikTaxableAmount;

  // 8. Income tax
  const incomeTax = calculateIncomeTax(taxableIncome, inputs.taxRegion);

  // 9. National Insurance (on gross after deductions, NOT including BIK)
  const nationalInsurance = calculateNationalInsurance(grossAfterDeductions);

  // 10. BIK tax (approximate using marginal rate)
  const config = getTaxConfig(inputs.taxRegion);
  const marginalRate = config.bands.find(b => taxableIncome >= b.min && (b.max === null || taxableIncome <= b.max))?.rate || 40;
  const bikTax = bikTaxableAmount * (marginalRate / 100);

  // 11. Adjusted Net Income (CRITICAL for benefits)
  const adjustedNetIncome = calculateAdjustedNetIncome(
    grossSalary,
    employeePension,
    carSalarySacrifice,
    bikTaxableAmount
  );

  // 12. Benefits impacts
  const benefitsImpact = calculateTotalBenefitsImpact(
    adjustedNetIncome,
    inputs.hasChildren,
    inputs.numberOfChildren,
    inputs.taxRegion
  );

  // 13. Take-home
  const annualTakeHome =
    grossAfterDeductions -
    incomeTax -
    nationalInsurance -
    bikTax -
    benefitsImpact.childBenefitCharge;
  const monthlyTakeHome = annualTakeHome / 12;

  // 14. Pension projections
  const totalPensionContribution = employeePension + employerPension;
  const pensionPotAt5Years = calculatePensionPot(employeePension, employerPension, 5);
  const pensionPotAtRetirement = calculatePensionAtRetirement(
    employeePension,
    employerPension,
    inputs.currentAge,
    inputs.retirementAge
  );

  // 15. Basic mortgage affordability
  const maxMortgageCapacity = calculateMaxMortgage(annualTakeHome);

  // 16. House purchase analysis (if inputs provided)
  const housePurchase = inputs.housePurchase
    ? analyzeHousePurchase(inputs.housePurchase, annualTakeHome, inputs.taxRegion)
    : undefined;

  // Build results object
  const results: CalculationResults = {
    grossSalary,
    employeePension,
    employerPension,
    carSalarySacrifice,
    bikTaxableAmount,
    grossAfterDeductions,
    taxableIncome,
    incomeTax,
    nationalInsurance,
    bikTax,
    adjustedNetIncome,
    childBenefitCharge: benefitsImpact.childBenefitCharge,
    taxFreeChildcareLoss: benefitsImpact.taxFreeChildcareLoss,
    freeChildcareLoss: benefitsImpact.freeChildcareLoss,
    annualTakeHome,
    monthlyTakeHome,
    totalPensionContribution,
    pensionPotAt5Years,
    pensionPotAtRetirement,
    maxMortgageCapacity,
    housePurchase,
    cliffEdgeWarnings: [],
  };

  // Generate cliff edge warnings
  results.cliffEdgeWarnings = generateCliffEdgeWarnings(inputs, results);

  return results;
}
