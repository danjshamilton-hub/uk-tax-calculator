// Multi-year projection calculation engine

import type {
  ProjectionInputs,
  ProjectionResults,
  YearResult,
  YearConfig,
  YearScenarioConfig,
  ProjectionComparison,
  YearDifference,
} from '../../types/projection';
import { calculateAllResults } from './index';
import type { ScenarioInputs } from '../../types/scenario';
import { formatTaxYear } from '../../data/bikRates';
import { constants } from '../../data/constants';

/**
 * Calculate the pro-rata factor for company car based on months active
 * Tax year runs April-March, so month 1 = April, month 12 = March
 *
 * @param startMonth - Start month (1-12, where 1=April)
 * @param endMonth - End month (1-12, where 12=March)
 * @returns Factor between 0 and 1
 */
export function calculateCarProRataFactor(startMonth: number = 1, endMonth: number = 12): number {
  // Clamp values to valid range
  const start = Math.max(1, Math.min(12, startMonth));
  const end = Math.max(1, Math.min(12, endMonth));

  if (end < start) {
    // Invalid range (end before start)
    return 0;
  }

  const monthsActive = end - start + 1;
  return monthsActive / 12;
}

/**
 * Calculate salary for a given year based on base salary and increases
 * @param baseSalary - Starting salary
 * @param year - Year number (1, 2, 3...)
 * @param defaultIncrease - Default annual increase percentage
 * @param salaryOverride - Optional explicit override
 */
function calculateYearSalary(
  baseSalary: number,
  year: number,
  defaultIncrease: number,
  salaryOverride?: number
): number {
  // Check for explicit override
  if (salaryOverride !== undefined) {
    return salaryOverride;
  }

  // Apply compound increase: base × (1 + rate)^(year-1)
  // Year 1 = base salary, Year 2 = base × 1.03, etc.
  const increaseRate = defaultIncrease / 100;
  return Math.round(baseSalary * Math.pow(1 + increaseRate, year - 1));
}

/**
 * Calculate pension pot growth for a year
 * Uses iterative approach: (previous pot + growth) + new contributions
 *
 * @param startingPot - Pot value at start of year
 * @param newContributions - Contributions made during the year
 * @param growthRate - Annual growth rate (default 5%)
 */
function calculatePensionGrowth(
  startingPot: number,
  newContributions: number,
  growthRate: number = constants.defaultInvestmentReturn
): { growth: number; endingPot: number } {
  const rate = growthRate / 100;

  // Growth on existing pot (full year)
  const potGrowth = startingPot * rate;

  // Contributions assumed made throughout year, so apply half-year growth
  const contributionGrowth = newContributions * (rate / 2);

  const totalGrowth = potGrowth + contributionGrowth;
  const endingPot = startingPot + totalGrowth + newContributions;

  return {
    growth: Math.round(totalGrowth),
    endingPot: Math.round(endingPot),
  };
}

/**
 * Calculate projection for a single scenario (A or B)
 */
export function calculateProjectionForScenario(
  inputs: ProjectionInputs,
  scenario: 'A' | 'B'
): ProjectionResults {
  const yearResults: YearResult[] = [];

  // Running totals
  let cumulativeTakeHome = 0;
  let cumulativeTaxPaid = 0;
  let cumulativePensionContributions = 0;
  let currentPensionPot = inputs.existingPensionPot || 0;

  for (let year = 1; year <= inputs.projectionYears; year++) {
    const taxYear = inputs.startingTaxYear + year - 1;
    const yearConfig = inputs.yearConfigs.find((c) => c.year === year);

    if (!yearConfig) {
      throw new Error(`Missing year config for year ${year}`);
    }

    // Get the correct scenario config
    const scenarioConfig = scenario === 'A' ? yearConfig.scenarioA : yearConfig.scenarioB;
    const carConfig = scenarioConfig.companyCar;

    // Calculate salary for this year
    const grossSalary = calculateYearSalary(
      inputs.baseSalary,
      year,
      inputs.defaultAnnualSalaryIncrease,
      scenarioConfig.salaryOverride
    );

    // Determine if car is active this year
    const hasCar = carConfig.hasCompanyCar;
    const bikRate = carConfig.carBIKPercentage;

    // Calculate car pro-rata factor
    const carProRata = hasCar
      ? calculateCarProRataFactor(carConfig.startMonth, carConfig.endMonth)
      : 0;

    const carMonthsActive = hasCar ? carConfig.endMonth - carConfig.startMonth + 1 : 0;

    // Full year car values
    const fullYearSalarySacrifice = hasCar ? carConfig.carSalarySacrifice * 12 : 0;
    const fullYearBikTaxable = hasCar ? (carConfig.carP11DValue * bikRate) / 100 : 0;

    // Pro-rata car values
    const proRataSalarySacrifice = Math.round(fullYearSalarySacrifice * carProRata);
    const proRataBikTaxable = Math.round(fullYearBikTaxable * carProRata * 100) / 100;

    // Determine if eligible for Tax-Free Childcare based on children count
    const hasChildrenForChildcare = scenarioConfig.numberOfChildrenForChildcare > 0;

    // Build single-year inputs for existing calculator
    const singleYearInputs: ScenarioInputs = {
      name: `Scenario ${scenario} - Year ${year}`,
      taxRegion: inputs.taxRegion,
      grossSalary,
      employeePensionPercentage: scenarioConfig.employeePensionPercentage,
      employerPensionPercentage: inputs.employerPensionPercentage,
      bonusAmount: scenarioConfig.bonusAmount,
      bonusSacrificePercentage: scenarioConfig.bonusSacrificePercentage,
      hasCompanyCar: hasCar,
      carSalarySacrifice: proRataSalarySacrifice,
      carP11DValue: carConfig.carP11DValue,
      carBIKPercentage: bikRate,
      carBIKProRataFactor: carProRata, // Apply same pro-rata as salary sacrifice
      currentAge: inputs.currentAge + year - 1,
      retirementAge: inputs.retirementAge,
      hasChildren: hasChildrenForChildcare,
      numberOfChildren: scenarioConfig.numberOfChildrenForChildcare,
    };

    // Use existing single-year calculator
    const singleYearResult = calculateAllResults(singleYearInputs);

    // Calculate pension growth iteratively
    const pensionCalc = calculatePensionGrowth(
      currentPensionPot,
      singleYearResult.totalPensionContribution
    );

    // Calculate total tax paid this year
    const totalTaxThisYear =
      singleYearResult.incomeTax +
      singleYearResult.nationalInsurance +
      singleYearResult.bikTax +
      singleYearResult.childBenefitCharge;

    // Update running totals
    cumulativeTakeHome += singleYearResult.annualTakeHome;
    cumulativeTaxPaid += totalTaxThisYear;
    cumulativePensionContributions += singleYearResult.totalPensionContribution;

    // Build year result
    const yearResult: YearResult = {
      year,
      taxYear: formatTaxYear(taxYear),

      grossSalary,
      bonusAmount: scenarioConfig.bonusAmount,
      bonusSacrificedToPension: singleYearResult.bonusSacrificedToPension,
      totalGrossIncome: singleYearResult.totalGrossIncome,

      employeePension: singleYearResult.employeePension,
      employerPension: singleYearResult.employerPension,
      carSalarySacrifice: fullYearSalarySacrifice,
      carSalarySacrificeProRata: proRataSalarySacrifice,
      bikTaxableAmount: fullYearBikTaxable,
      bikTaxableAmountProRata: proRataBikTaxable,

      incomeTax: singleYearResult.incomeTax,
      nationalInsurance: singleYearResult.nationalInsurance,
      bikTax: singleYearResult.bikTax,
      childBenefitCharge: singleYearResult.childBenefitCharge,
      taxFreeChildcareBenefit: singleYearResult.taxFreeChildcareBenefit,
      totalTaxPaid: totalTaxThisYear,

      annualTakeHome: singleYearResult.annualTakeHome,
      monthlyTakeHome: singleYearResult.monthlyTakeHome,
      adjustedNetIncome: singleYearResult.adjustedNetIncome,

      effectiveTaxRate: singleYearResult.effectiveTaxRate,
      marginalTaxRate: singleYearResult.marginalTaxRate,
      combinedMarginalRate: singleYearResult.combinedMarginalRate,
      employeePensionPercentage: scenarioConfig.employeePensionPercentage,

      yearStartPensionPot: currentPensionPot,
      totalPensionContribution: singleYearResult.totalPensionContribution,
      pensionGrowth: pensionCalc.growth,
      yearEndPensionPot: pensionCalc.endingPot,

      carMonthsActive,
      carBIKPercentage: bikRate,
      carProRataFactor: carProRata,

      numberOfChildrenForChildcare: scenarioConfig.numberOfChildrenForChildcare,

      cumulativeTakeHome,
      cumulativeTaxPaid,
      cumulativePensionContributions,
    };

    yearResults.push(yearResult);

    // Update pension pot for next iteration
    currentPensionPot = pensionCalc.endingPot;
  }

  // Calculate final totals and growth metrics
  const firstYear = yearResults[0];
  const lastYear = yearResults[yearResults.length - 1];

  const salaryGrowthPercent =
    firstYear.grossSalary > 0
      ? ((lastYear.grossSalary - firstYear.grossSalary) / firstYear.grossSalary) * 100
      : 0;

  const takeHomeGrowthPercent =
    firstYear.annualTakeHome > 0
      ? ((lastYear.annualTakeHome - firstYear.annualTakeHome) / firstYear.annualTakeHome) * 100
      : 0;

  return {
    scenarioName: `Scenario ${scenario}`,
    projectionYears: inputs.projectionYears,
    startingTaxYear: inputs.startingTaxYear,

    yearResults,

    totalTakeHome: cumulativeTakeHome,
    totalTaxPaid: cumulativeTaxPaid,
    totalPensionContributions: cumulativePensionContributions,
    finalPensionPot: currentPensionPot,

    averageAnnualTakeHome: cumulativeTakeHome / inputs.projectionYears,
    averageEffectiveTaxRate:
      yearResults.reduce((sum, r) => sum + r.effectiveTaxRate, 0) / yearResults.length,

    salaryGrowthPercent: Math.round(salaryGrowthPercent * 10) / 10,
    takeHomeGrowthPercent: Math.round(takeHomeGrowthPercent * 10) / 10,
    pensionPotGrowthAmount: currentPensionPot - (inputs.existingPensionPot || 0),
  };
}

/**
 * Calculate both scenarios and return comparison
 */
export function calculateProjectionComparison(inputs: ProjectionInputs): ProjectionComparison {
  const scenarioA = calculateProjectionForScenario(inputs, 'A');
  const scenarioB = calculateProjectionForScenario(inputs, 'B');

  return compareProjections(scenarioA, scenarioB);
}

/**
 * Compare two projection scenarios
 */
export function compareProjections(
  scenarioA: ProjectionResults,
  scenarioB: ProjectionResults
): ProjectionComparison {
  const yearDifferences: YearDifference[] = scenarioA.yearResults.map((a, idx) => {
    const b = scenarioB.yearResults[idx];
    return {
      year: a.year,
      taxYear: a.taxYear,
      takeHomeDiff: b.annualTakeHome - a.annualTakeHome,
      pensionPotDiff: b.yearEndPensionPot - a.yearEndPensionPot,
      cumulativeTakeHomeDiff: b.cumulativeTakeHome - a.cumulativeTakeHome,
      cumulativePensionDiff: b.cumulativePensionContributions - a.cumulativePensionContributions,
    };
  });

  // Find pension break-even year
  // When pension pot advantage covers cumulative take-home loss
  let pensionBreakEvenYear: number | undefined;
  for (const diff of yearDifferences) {
    // If B has lower take-home but higher pension
    if (diff.cumulativeTakeHomeDiff < 0 && diff.pensionPotDiff > 0) {
      if (diff.pensionPotDiff >= Math.abs(diff.cumulativeTakeHomeDiff)) {
        pensionBreakEvenYear = diff.year;
        break;
      }
    }
  }

  // Generate summary insight
  const totalTakeHomeDiff = scenarioB.totalTakeHome - scenarioA.totalTakeHome;
  const pensionDiff = scenarioB.finalPensionPot - scenarioA.finalPensionPot;

  let summary = '';
  if (totalTakeHomeDiff > 0 && pensionDiff > 0) {
    summary = `Scenario B provides both higher take-home (+${formatCurrencyShort(totalTakeHomeDiff)}) and larger pension pot (+${formatCurrencyShort(pensionDiff)})`;
  } else if (totalTakeHomeDiff < 0 && pensionDiff > 0) {
    summary = `Scenario B trades ${formatCurrencyShort(Math.abs(totalTakeHomeDiff))} take-home for ${formatCurrencyShort(pensionDiff)} more in pension`;
    if (pensionBreakEvenYear) {
      summary += ` (break-even in year ${pensionBreakEvenYear})`;
    }
  } else if (totalTakeHomeDiff > 0 && pensionDiff < 0) {
    summary = `Scenario B provides ${formatCurrencyShort(totalTakeHomeDiff)} more take-home but ${formatCurrencyShort(Math.abs(pensionDiff))} less pension`;
  } else {
    summary = `Scenario B results in lower take-home and smaller pension pot`;
  }

  return {
    scenarioA,
    scenarioB,
    totalTakeHomeDifference: totalTakeHomeDiff,
    totalTaxDifference: scenarioB.totalTaxPaid - scenarioA.totalTaxPaid,
    finalPensionPotDifference: pensionDiff,
    yearDifferences,
    pensionBreakEvenYear,
    summary,
  };
}

/**
 * Helper to format currency in short form for summaries
 */
function formatCurrencyShort(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000) {
    return `£${(absValue / 1000).toFixed(1)}k`;
  }
  return `£${absValue.toFixed(0)}`;
}

/**
 * Create default year scenario config
 */
export function createDefaultYearScenarioConfig(
  employeePensionPercentage: number,
  numberOfChildrenForChildcare: number = 0
): YearScenarioConfig {
  return {
    employeePensionPercentage,
    bonusAmount: 0,
    bonusSacrificePercentage: 0,
    companyCar: {
      hasCompanyCar: false,
      carSalarySacrifice: 500,
      carP11DValue: 35000,
      carBIKPercentage: 2,
      startMonth: 1,
      endMonth: 12,
    },
    numberOfChildrenForChildcare,
  };
}

/**
 * Create default year configs for a projection
 */
export function createDefaultYearConfigs(
  years: number,
  employeePensionPercentageA: number,
  employeePensionPercentageB: number,
  numberOfChildrenForChildcare: number = 0
): YearConfig[] {
  return Array.from({ length: years }, (_, i) => ({
    year: i + 1,
    scenarioA: createDefaultYearScenarioConfig(employeePensionPercentageA, numberOfChildrenForChildcare),
    scenarioB: createDefaultYearScenarioConfig(employeePensionPercentageB, numberOfChildrenForChildcare),
  }));
}
