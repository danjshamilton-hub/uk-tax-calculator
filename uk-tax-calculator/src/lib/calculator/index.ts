// Main Calculation Orchestrator
// Follows the precise calculation order from the plan

import type { ScenarioInputs, CalculationResults, ThresholdHeadroom } from '../../types/scenario';
import { calculateEmployeePension, calculateEmployerPension, calculatePensionPot, calculatePensionAtRetirement } from './pension';
import { calculateBIKTaxableAmount } from './companyCard';
import { calculateIncomeTax } from './incomeTax';
export { getTaxBreakdown } from './incomeTax';
export type { TaxBracketBreakdown } from './incomeTax';
import { calculateNationalInsurance } from './nationalInsurance';
import { calculateStudentLoanRepayment, calculatePostgradLoanRepayment, getMarginalStudentLoanRate } from './studentLoan';
import { calculateAdjustedNetIncome, calculateTotalBenefitsImpact, calculateAnnualChildBenefit } from './benefits';
import { calculateMaxMortgage } from './mortgageRepayment';
import { analyzeHousePurchase } from './housePurchase';
import { getTaxConfig, getBenefitsThresholds, getNIBands, DEFAULT_TAX_YEAR } from '../../data/taxYears';
import type { TaxRegion } from '../../data/taxYears';

/**
 * Calculate marginal income tax rate for a given taxable income
 */
function getMarginalTaxRate(
  taxableIncome: number,
  region: TaxRegion,
  taxYear: number = DEFAULT_TAX_YEAR
): number {
  const config = getTaxConfig(region, taxYear);
  const { personalAllowanceTaperStart, personalAllowanceTaperEnd } = config;

  // In PA taper zone, effective marginal rate is higher
  if (taxableIncome >= personalAllowanceTaperStart && taxableIncome < personalAllowanceTaperEnd) {
    // For every £2 earned, lose £1 of PA, so pay extra tax on that £1
    // Base rate in this zone is typically 40%, but effective is ~60%
    const baseRate = config.bands.find(b => taxableIncome >= b.min && (b.max === null || taxableIncome <= b.max))?.rate || 40;
    return baseRate * 1.5; // Approximation of the 60% effective rate
  }

  // Find the band this income falls into
  const band = config.bands.find(b => taxableIncome >= b.min && (b.max === null || taxableIncome <= b.max));
  return band?.rate || 0;
}

/**
 * Calculate marginal NI rate for a given gross income
 */
function getMarginalNIRate(grossIncome: number, taxYear: number = DEFAULT_TAX_YEAR): number {
  const band = getNIBands(taxYear).find(b => grossIncome >= b.min && (b.max === null || grossIncome <= b.max));
  return band?.rate || 0;
}

/**
 * Calculate additional marginal rate from Child Benefit High Income Charge taper
 * In the £60k-£80k ANI zone, for every £200 over £60k, you lose 1% of child benefit
 * This effectively adds to your marginal tax rate
 *
 * @param adjustedNetIncome - ANI for the calculation
 * @param numberOfChildren - Number of children for child benefit
 * @returns Additional marginal rate percentage due to CB taper
 */
function getChildBenefitMarginalImpact(
  adjustedNetIncome: number,
  numberOfChildren: number,
  taxYear: number = DEFAULT_TAX_YEAR
): number {
  if (numberOfChildren <= 0) return 0;

  const { taperStart, taperEnd, annualBenefitFirstChild, annualBenefitAdditionalChild } =
    getBenefitsThresholds(taxYear).childBenefit;

  // Only applies within the taper zone
  if (adjustedNetIncome < taperStart || adjustedNetIncome >= taperEnd) {
    return 0;
  }

  // Calculate total annual child benefit
  const totalChildBenefit =
    annualBenefitFirstChild + Math.max(0, numberOfChildren - 1) * annualBenefitAdditionalChild;

  // The taper works over the £20k range (60k to 80k)
  // Total child benefit is lost linearly over this range
  // So the effective marginal rate = totalChildBenefit / taperRange
  const taperRange = taperEnd - taperStart;
  const effectiveMarginalRate = (totalChildBenefit / taperRange) * 100;

  return Math.round(effectiveMarginalRate * 100) / 100;
}

/**
 * Calculate headroom to key thresholds
 */
function calculateHeadroom(
  adjustedNetIncome: number,
  taxableIncome: number,
  hasChildren: boolean,
  region: TaxRegion,
  taxYear: number = DEFAULT_TAX_YEAR
): ThresholdHeadroom[] {
  const config = getTaxConfig(region, taxYear);
  const benefitsThresholds = getBenefitsThresholds(taxYear);
  const headroom: ThresholdHeadroom[] = [];

  // Child Benefit taper start (£60k)
  if (hasChildren) {
    headroom.push({
      name: 'Child Benefit Taper Start',
      threshold: benefitsThresholds.childBenefit.taperStart,
      currentValue: adjustedNetIncome,
      headroom: benefitsThresholds.childBenefit.taperStart - adjustedNetIncome,
      marginalRateIfExceeded: 61, // Approximate effective rate in taper zone
      warning: adjustedNetIncome >= benefitsThresholds.childBenefit.taperStart ? 'In taper zone' : undefined,
    });

    // Child Benefit taper end (£80k)
    headroom.push({
      name: 'Child Benefit Taper End',
      threshold: benefitsThresholds.childBenefit.taperEnd,
      currentValue: adjustedNetIncome,
      headroom: benefitsThresholds.childBenefit.taperEnd - adjustedNetIncome,
      warning: adjustedNetIncome >= benefitsThresholds.childBenefit.taperEnd ? 'Full charge applies' : undefined,
    });
  }

  // Personal Allowance taper start (£100k)
  headroom.push({
    name: 'Personal Allowance Taper',
    threshold: config.personalAllowanceTaperStart,
    currentValue: adjustedNetIncome,
    headroom: config.personalAllowanceTaperStart - adjustedNetIncome,
    marginalRateIfExceeded: 60, // Approximate effective rate in taper zone
    warning: adjustedNetIncome >= config.personalAllowanceTaperStart ? 'PA tapering' : undefined,
  });

  // Tax-Free Childcare threshold (£100k) - only for parents
  if (hasChildren) {
    headroom.push({
      name: 'Tax-Free Childcare Loss',
      threshold: benefitsThresholds.taxFreeChildcare.threshold,
      currentValue: adjustedNetIncome,
      headroom: benefitsThresholds.taxFreeChildcare.threshold - adjustedNetIncome,
      warning: adjustedNetIncome > benefitsThresholds.taxFreeChildcare.threshold ? 'Eligibility lost' : undefined,
    });
  }

  // Personal Allowance fully tapered (£125,140)
  headroom.push({
    name: 'Personal Allowance Gone',
    threshold: config.personalAllowanceTaperEnd,
    currentValue: adjustedNetIncome,
    headroom: config.personalAllowanceTaperEnd - adjustedNetIncome,
    warning: adjustedNetIncome >= config.personalAllowanceTaperEnd ? 'No PA remaining' : undefined,
  });

  // Next tax band based on taxable income
  for (const band of config.bands) {
    if (band.max !== null && taxableIncome < band.max && taxableIncome >= band.min) {
      headroom.push({
        name: `${band.rate}% Tax Band Limit`,
        threshold: band.max,
        currentValue: taxableIncome,
        headroom: band.max - taxableIncome,
      });
      break;
    }
  }

  return headroom.sort((a, b) => a.headroom - b.headroom);
}

/**
 * Generate cliff edge warnings based on income and circumstances
 */
function generateCliffEdgeWarnings(inputs: ScenarioInputs, results: CalculationResults): string[] {
  const warnings: string[] = [];
  const ani = results.adjustedNetIncome;
  const taxYear = inputs.taxYear ?? DEFAULT_TAX_YEAR;
  const config = getTaxConfig(inputs.taxRegion, taxYear);
  const benefitsThresholds = getBenefitsThresholds(taxYear);

  // Get thresholds from constants
  const { taperStart: cbTaperStart, taperEnd: cbTaperEnd } = benefitsThresholds.childBenefit;
  const { personalAllowanceTaperStart, personalAllowanceTaperEnd } = config;
  const approachingThreshold = 5000; // Warning margin before thresholds

  // Child Benefit taper zone
  if (inputs.hasChildren && ani >= cbTaperStart - approachingThreshold && ani < cbTaperStart) {
    warnings.push(`⚠️ Approaching Child Benefit taper (starts at £${cbTaperStart.toLocaleString()} ANI). Current ANI: £${ani.toLocaleString()}`);
  } else if (inputs.hasChildren && ani >= cbTaperStart && ani < cbTaperEnd) {
    warnings.push(`⚠️ In Child Benefit taper zone (£${cbTaperStart.toLocaleString()}-£${cbTaperEnd.toLocaleString()}). Effective marginal rate ~61%. Current ANI: £${ani.toLocaleString()}`);
  }

  // £100k threshold (multiple cliff edges)
  if (ani >= personalAllowanceTaperStart - approachingThreshold && ani < personalAllowanceTaperStart) {
    const impacts: string[] = [];
    if (inputs.hasChildren) {
      impacts.push(`Tax-Free Childcare (£${benefitsThresholds.taxFreeChildcare.governmentContributionPerChild.toLocaleString()}/child)`);
      if (inputs.taxRegion === 'england') {
        impacts.push('30 Hours Free Childcare');
      }
    }
    impacts.push('Personal Allowance starts tapering');
    warnings.push(`⚠️ Approaching £${personalAllowanceTaperStart.toLocaleString()} threshold. Will lose: ${impacts.join(', ')}`);
  } else if (ani >= personalAllowanceTaperStart && ani < personalAllowanceTaperEnd) {
    warnings.push(`⚠️ Personal Allowance taper zone (£${personalAllowanceTaperStart.toLocaleString()}-£${personalAllowanceTaperEnd.toLocaleString()}). Effective marginal rate ~60%. Current ANI: £${ani.toLocaleString()}`);
  }

  // Suggestions
  if (ani >= cbTaperStart && ani < cbTaperEnd && inputs.hasChildren) {
    const targetReduction = ani - (cbTaperStart - 1);
    const pensionIncrease = Math.ceil((targetReduction / results.grossSalary) * 100);
    warnings.push(`💡 Consider increasing pension by ${pensionIncrease}% to reduce ANI below £${cbTaperStart.toLocaleString()}`);
  }

  if (ani >= personalAllowanceTaperStart && ani < personalAllowanceTaperEnd) {
    const targetReduction = ani - (personalAllowanceTaperStart - 1);
    const pensionIncrease = Math.ceil((targetReduction / results.grossSalary) * 100);
    warnings.push(`💡 Consider increasing pension by ${pensionIncrease}% to reduce ANI below £${personalAllowanceTaperStart.toLocaleString()}`);
  }

  return warnings;
}

/**
 * Main calculation function following the precise order from the plan
 */
export function calculateAllResults(inputs: ScenarioInputs): CalculationResults {
  // Tax year these figures are calculated in (2026 = 2026/27)
  const taxYear = inputs.taxYear ?? DEFAULT_TAX_YEAR;

  // 1. Start with original gross salary, bonus, and cash car allowance
  const grossSalary = inputs.grossSalary;
  const bonusAmount = inputs.bonusAmount || 0;
  const bonusSacrificePercentage = inputs.bonusSacrificePercentage || 0;
  // Car allowance is paid as cash: subject to income tax and NI like salary,
  // counts towards ANI, but is NOT pensionable and NOT salary-sacrificed
  const carAllowance = inputs.carAllowance || 0;

  // Calculate bonus sacrifice amount based on percentage
  const bonusSacrificedToPension = bonusAmount * (bonusSacrificePercentage / 100);

  // Total gross before any deductions
  const totalGrossIncome = grossSalary + bonusAmount + carAllowance;

  // Effective gross for calculations (after bonus sacrifice)
  const effectiveGross = grossSalary + bonusAmount + carAllowance - bonusSacrificedToPension;

  // 2-3. Employee and employer pension (on salary only, not bonus - unless sacrificed)
  const employeePension = calculateEmployeePension(grossSalary, inputs.employeePensionPercentage);
  const employerPension = calculateEmployerPension(grossSalary, inputs.employerPensionPercentage);

  // Total pension including sacrificed bonus
  const totalEmployeePensionContribution = employeePension + bonusSacrificedToPension;

  // 4. Car salary sacrifice applied AFTER pension calculations
  const carSalarySacrifice = inputs.hasCompanyCar ? inputs.carSalarySacrifice : 0;

  // 5. Gross after deductions (using effective gross which excludes sacrificed bonus)
  const grossAfterDeductions = effectiveGross - employeePension - carSalarySacrifice;

  // 6. BIK taxable amount (apply pro-rata factor for partial year car usage)
  const bikProRataFactor = inputs.carBIKProRataFactor ?? 1;
  const fullYearBikTaxable = inputs.hasCompanyCar
    ? calculateBIKTaxableAmount(inputs.carP11DValue, inputs.carBIKPercentage)
    : 0;
  const bikTaxableAmount = Math.round(fullYearBikTaxable * bikProRataFactor * 100) / 100;

  // 7. Taxable income
  const taxableIncome = grossAfterDeductions + bikTaxableAmount;

  // 8. Income tax
  const incomeTax = calculateIncomeTax(taxableIncome, inputs.taxRegion, taxYear);

  // 9. National Insurance (on gross after deductions, NOT including BIK)
  // NI can be supplied by callers that model uneven pay across the year (e.g. parental
  // leave), where the per-pay-period basis differs materially from the annual basis.
  const nationalInsurance =
    inputs.nationalInsuranceOverride ??
    calculateNationalInsurance(grossAfterDeductions, taxYear);

  // 9b. Student loan repayments (same pay basis as NI: post-sacrifice pay, excluding BIK)
  const studentLoanPlan = inputs.studentLoanPlan ?? 'none';
  const hasPostgradLoan = inputs.hasPostgradLoan ?? false;
  const studentLoanRepayment =
    inputs.studentLoanOverride ??
    calculateStudentLoanRepayment(grossAfterDeductions, studentLoanPlan, taxYear);
  const postgradLoanRepayment =
    inputs.postgradLoanOverride ??
    calculatePostgradLoanRepayment(grossAfterDeductions, hasPostgradLoan, taxYear);

  // 10. BIK tax (approximate using marginal rate)
  const currentMarginalTaxRate = getMarginalTaxRate(taxableIncome, inputs.taxRegion, taxYear);
  const bikTax = bikTaxableAmount * (currentMarginalTaxRate / 100);

  // 11. Adjusted Net Income (CRITICAL for benefits)
  // ANI uses effective gross (after bonus sacrifice)
  const adjustedNetIncome = calculateAdjustedNetIncome(
    effectiveGross,
    employeePension,
    carSalarySacrifice,
    bikTaxableAmount
  );

  // 12. Benefits impacts
  const benefitsImpact = calculateTotalBenefitsImpact(
    adjustedNetIncome,
    inputs.hasChildren,
    inputs.numberOfChildren,
    inputs.taxRegion,
    taxYear
  );

  // Child Benefit: only received (and only charged) if the family claims it.
  // The HICBC can never exceed the benefit, so claiming is never worse than not claiming.
  const claimsChildBenefit = inputs.hasChildren && (inputs.claimsChildBenefit ?? true);
  const childBenefitReceived = claimsChildBenefit
    ? calculateAnnualChildBenefit(inputs.numberOfChildren, taxYear)
    : 0;
  const childBenefitCharge = claimsChildBenefit ? benefitsImpact.childBenefitCharge : 0;
  const netChildBenefit = childBenefitReceived - childBenefitCharge;

  // 13. Take-home
  // Note: incomeTax is calculated on taxableIncome which includes bikTaxableAmount,
  // so we do NOT subtract bikTax separately - it's already included in incomeTax.
  // Child benefit is added as cash received, net of the high income charge.
  const annualTakeHome =
    grossAfterDeductions -
    incomeTax -
    nationalInsurance -
    studentLoanRepayment -
    postgradLoanRepayment +
    netChildBenefit;
  const monthlyTakeHome = annualTakeHome / 12;

  // 14. Calculate effective tax rate (payroll deductions as % of total gross)
  // bikTax is already included in incomeTax, so it is not added again here
  const taxesPaid =
    incomeTax + nationalInsurance + studentLoanRepayment + postgradLoanRepayment + childBenefitCharge;
  const effectiveTaxRate = totalGrossIncome > 0 ? (taxesPaid / totalGrossIncome) * 100 : 0;

  // 15. Calculate marginal rates
  const marginalTaxRate = getMarginalTaxRate(taxableIncome, inputs.taxRegion, taxYear);
  const marginalNIRate = getMarginalNIRate(grossAfterDeductions, taxYear);

  // Calculate Child Benefit taper impact if applicable (only bites if claiming)
  const childBenefitMarginalImpact = claimsChildBenefit
    ? getChildBenefitMarginalImpact(adjustedNetIncome, inputs.numberOfChildren, taxYear)
    : 0;

  // Marginal student loan rate on the next £1 of pay
  const marginalStudentLoanRate = getMarginalStudentLoanRate(
    grossAfterDeductions,
    studentLoanPlan,
    hasPostgradLoan,
    taxYear
  );

  // Combined rate includes income tax, NI, student loan, and child benefit taper effect
  const combinedMarginalRate =
    marginalTaxRate + marginalNIRate + marginalStudentLoanRate + childBenefitMarginalImpact;

  // 16. Calculate headroom to thresholds
  const headroom = calculateHeadroom(
    adjustedNetIncome,
    taxableIncome,
    inputs.hasChildren,
    inputs.taxRegion,
    taxYear
  );

  // 17. Pension projections (including sacrificed bonus)
  const totalPensionContribution = totalEmployeePensionContribution + employerPension;
  const pensionPotAt5Years = calculatePensionPot(totalEmployeePensionContribution, employerPension, 5);
  const pensionPotAtRetirement = calculatePensionAtRetirement(
    totalEmployeePensionContribution,
    employerPension,
    inputs.currentAge,
    inputs.retirementAge
  );

  // 18. Basic mortgage affordability
  const maxMortgageCapacity = calculateMaxMortgage(annualTakeHome);

  // 19. House purchase analysis (if inputs provided)
  const housePurchase = inputs.housePurchase
    ? analyzeHousePurchase(inputs.housePurchase, annualTakeHome, inputs.taxRegion)
    : undefined;

  // Build results object
  const results: CalculationResults = {
    grossSalary,
    bonusAmount,
    bonusSacrificedToPension,
    carAllowance,
    totalGrossIncome,
    employeePension: totalEmployeePensionContribution,
    employerPension,
    carSalarySacrifice,
    bikTaxableAmount,
    grossAfterDeductions,
    taxableIncome,
    incomeTax,
    nationalInsurance,
    bikTax,
    studentLoanRepayment,
    postgradLoanRepayment,
    adjustedNetIncome,
    effectiveTaxRate: Math.round(effectiveTaxRate * 10) / 10,
    marginalTaxRate,
    marginalNIRate,
    marginalStudentLoanRate,
    combinedMarginalRate,
    headroom,
    childBenefitReceived,
    childBenefitCharge,
    netChildBenefit,
    taxFreeChildcareBenefit: benefitsImpact.taxFreeChildcareBenefit,
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
