import { useMemo } from 'react';
import { calculateAllResults } from './lib/calculator';
import type { ScenarioInputs, HousePurchaseInputs, CalculationResults } from './types/scenario';
import { DEFAULT_TAX_YEAR, formatTaxYear } from './data/taxYears';
import type { TaxRegion } from './data/taxYears';
import type {
  SalaryState,
  CompanyCarState,
  BonusState,
  ChildrenState,
  ScenarioBState,
  HouseState,
  BudgetState,
  MaternityState,
  Partner2State,
} from './types/appState';
import { DEFAULT_MATERNITY, DEFAULT_PARTNER2 } from './types/appState';
import { constants } from './data/constants';
import { usePersistedState } from './hooks/usePersistedState';

import { SalaryTab } from './components/SalaryTab';
import { HousePurchaseTab } from './components/HousePurchaseTab';
import { ProjectionsTab } from './components/ProjectionsTab';
import { BudgetingTab } from './components/BudgetingTab';
import { MaternityTab } from './components/MaternityTab';

function App() {
  // ─── Persisted grouped state ───
  const [activeTab, setActiveTab] = usePersistedState<'salary' | 'house' | 'projections' | 'budget' | 'maternity'>('app:activeTab', 'salary');
  const [compareMode, setCompareMode] = usePersistedState('app:compareMode', false);

  const [salary, setSalary] = usePersistedState<SalaryState>('app:salary', {
    grossSalary: 50000,
    taxRegion: 'scotland',
    employeePensionPercentage: 5,
    employerPensionPercentage: 3,
    currentAge: 35,
    retirementAge: 65,
    studentLoanPlan: 'none',
    hasPostgradLoan: false,
  });

  const [companyCar, setCompanyCar] = usePersistedState<CompanyCarState>('app:companyCar', {
    hasCompanyCar: false,
    carSalarySacrifice: 500,
    carP11DValue: 35000,
    carBIKPercentage: 2,
  });

  const [bonus, setBonus] = usePersistedState<BonusState>('app:bonus', {
    bonusAmount: 0,
    bonusSacrificePercentage: 0,
  });

  const [children, setChildren] = usePersistedState<ChildrenState>('app:children', {
    hasChildren: false,
    numberOfChildren: 2,
    claimsChildBenefitA: true,
    claimsChildBenefitB: true,
    usesTaxFreeChildcareA: true,
    usesTaxFreeChildcareB: true,
  });

  const [scenarioB, setScenarioB] = usePersistedState<ScenarioBState>('app:scenarioB', {
    grossSalary: 50000,
    employeePensionPercentage: 10,
    companyCar: { hasCompanyCar: false, carSalarySacrifice: 500, carP11DValue: 35000, carBIKPercentage: 2 },
    bonus: { bonusAmount: 0, bonusSacrificePercentage: 0 },
  });

  const [house, setHouse] = usePersistedState<HouseState>('app:house', {
    houseValuation: 300000,
    purchasePrice: 300000,
    depositPercentage: 10,
    partnerGrossSalary: 0,
    currentBalance: 50000,
    currentHouseSalePrice: 0,
    currentHouseMortgage: 0,
    movingCosts: 5000,
    mortgageInterestRate: 4.5,
    mortgageTerm: 25,
    useGrossForMortgage: false,
    mortgageMaxOverride: 0,
  });

  const [partner2, setPartner2] = usePersistedState<Partner2State>('app:partner2', DEFAULT_PARTNER2);

  const [maternity, setMaternity] = usePersistedState<MaternityState>('app:maternity', DEFAULT_MATERNITY);

  const [budget, setBudget] = usePersistedState<BudgetState>('app:budget', {
    expenses: [],
    partner2TakeHome: 0,
    jointContrib1: 0,
    jointContrib2: 0,
    mortgageOverride: null,
    useMortgageOverride: false,
    projectionYears: constants.defaultBudgetProjectionYears,
    savingsGrowthRate: constants.defaultSavingsGrowthRate,
  });

  // ─── Derived / Memoized calculations ───

  const housePurchaseInputs: HousePurchaseInputs = useMemo(() => ({
    houseValuation: house.houseValuation,
    purchasePrice: house.purchasePrice,
    depositPercentage: house.depositPercentage,
    partnerGrossSalary: house.partnerGrossSalary,
    currentBalance: house.currentBalance,
    currentHouseSalePrice: house.currentHouseSalePrice,
    currentHouseMortgage: house.currentHouseMortgage,
    movingCosts: house.movingCosts,
    mortgageInterestRate: house.mortgageInterestRate,
    mortgageTerm: house.mortgageTerm,
    useGrossForMortgage: house.useGrossForMortgage,
    mortgageMaxOverride: house.mortgageMaxOverride > 0 ? house.mortgageMaxOverride : undefined,
    yourGrossSalary: salary.grossSalary,
  }), [house, salary.grossSalary]);

  const inputsA: ScenarioInputs = useMemo(() => ({
    name: 'Scenario A',
    taxRegion: salary.taxRegion,
    grossSalary: salary.grossSalary,
    employeePensionPercentage: salary.employeePensionPercentage,
    employerPensionPercentage: salary.employerPensionPercentage,
    bonusAmount: bonus.bonusAmount,
    bonusSacrificePercentage: bonus.bonusSacrificePercentage,
    hasCompanyCar: companyCar.hasCompanyCar,
    carSalarySacrifice: companyCar.hasCompanyCar ? companyCar.carSalarySacrifice * 12 : 0,
    carP11DValue: companyCar.carP11DValue,
    carBIKPercentage: companyCar.carBIKPercentage,
    carAllowance: (companyCar.carAllowance ?? 0) * 12,
    currentAge: salary.currentAge,
    retirementAge: salary.retirementAge,
    studentLoanPlan: salary.studentLoanPlan ?? 'none',
    hasPostgradLoan: salary.hasPostgradLoan ?? false,
    hasChildren: children.hasChildren,
    numberOfChildren: children.hasChildren ? children.numberOfChildren : 0,
    claimsChildBenefit: children.claimsChildBenefitA,
    housePurchase: housePurchaseInputs,
  }), [salary, bonus, companyCar, children, housePurchaseInputs]);

  const inputsB: ScenarioInputs = useMemo(() => ({
    ...inputsA,
    name: 'Scenario B',
    grossSalary: scenarioB.grossSalary,
    employeePensionPercentage: scenarioB.employeePensionPercentage,
    employerPensionPercentage: scenarioB.employerPensionPercentage ?? salary.employerPensionPercentage,
    bonusAmount: scenarioB.bonus.bonusAmount,
    bonusSacrificePercentage: scenarioB.bonus.bonusSacrificePercentage,
    hasCompanyCar: scenarioB.companyCar.hasCompanyCar,
    carSalarySacrifice: scenarioB.companyCar.hasCompanyCar ? scenarioB.companyCar.carSalarySacrifice * 12 : 0,
    carP11DValue: scenarioB.companyCar.carP11DValue,
    carBIKPercentage: scenarioB.companyCar.carBIKPercentage,
    carAllowance: (scenarioB.companyCar.carAllowance ?? 0) * 12,
    claimsChildBenefit: children.claimsChildBenefitB,
  }), [inputsA, scenarioB, children.claimsChildBenefitB, salary.employerPensionPercentage]);

  const inputsPartner2: ScenarioInputs = useMemo(() => ({
    name: 'Partner 2',
    taxRegion: partner2.taxRegion,
    grossSalary: partner2.grossSalary,
    employeePensionPercentage: partner2.employeePensionPercentage,
    employerPensionPercentage: partner2.employerPensionPercentage,
    bonusAmount: partner2.bonus.bonusAmount,
    bonusSacrificePercentage: partner2.bonus.bonusSacrificePercentage,
    hasCompanyCar: partner2.companyCar.hasCompanyCar,
    carSalarySacrifice: partner2.companyCar.hasCompanyCar ? partner2.companyCar.carSalarySacrifice * 12 : 0,
    carP11DValue: partner2.companyCar.carP11DValue,
    carBIKPercentage: partner2.companyCar.carBIKPercentage,
    carAllowance: (partner2.companyCar.carAllowance ?? 0) * 12,
    currentAge: partner2.currentAge,
    retirementAge: partner2.retirementAge,
    studentLoanPlan: partner2.studentLoanPlan ?? 'none',
    hasPostgradLoan: partner2.hasPostgradLoan ?? false,
    // Child Benefit and Tax-Free Childcare are assessed on the household, so
    // they are handled where both partners are known rather than per person.
    hasChildren: false,
    numberOfChildren: 0,
    claimsChildBenefit: false,
  }), [partner2]);

  const resultA = useMemo(() => calculateAllResults(inputsA), [inputsA]);
  const resultP2 = useMemo(
    () => partner2.enabled ? calculateAllResults(inputsPartner2) : null,
    [partner2.enabled, inputsPartner2]
  );
  const resultB = useMemo(() => compareMode ? calculateAllResults(inputsB) : null, [compareMode, inputsB]);

  // ─── Adjusted take-home values ───

  // Child benefit claiming is now handled inside the calculator (via claimsChildBenefit input),
  // so annualTakeHome already includes child benefit received net of the high income charge.
  const getAdjustedValues = (result: CalculationResults, usesTaxFreeChildcare: boolean) => {
    const effectiveCharge = result.childBenefitCharge;
    const adjustedAnnual = result.annualTakeHome;
    const adjustedMonthly = adjustedAnnual / 12;
    const taxFreeChildcareBenefitAmount = usesTaxFreeChildcare ? result.taxFreeChildcareBenefit : 0;
    const effectiveMonthly = adjustedMonthly + (taxFreeChildcareBenefitAmount / 12);
    const hasTaxFreeChildcareBenefit = usesTaxFreeChildcare && result.taxFreeChildcareBenefit > 0;
    return { effectiveCharge, adjustedAnnual, adjustedMonthly, effectiveMonthly, hasTaxFreeChildcareBenefit, taxFreeChildcareBenefitAmount };
  };

  const adjA = useMemo(
    () => getAdjustedValues(resultA, children.usesTaxFreeChildcareA),
    [resultA, children.usesTaxFreeChildcareA]
  );
  const adjB = useMemo(
    () => resultB ? getAdjustedValues(resultB, children.usesTaxFreeChildcareB) : null,
    [resultB, children.usesTaxFreeChildcareB]
  );

  // ─── Tab style helper ───
  const tabCls = (isActive: boolean) =>
    `px-6 py-3 border-b-[3px] text-[15px] cursor-pointer transition-all ${
      isActive
        ? 'border-blue-600 bg-blue-50 text-blue-600 font-semibold'
        : 'border-transparent text-gray-500 font-normal hover:text-gray-700'
    }`;

  // Budget state updater
  const updateBudget = (updates: Partial<BudgetState>) => setBudget(prev => ({ ...prev, ...updates }));

  return (
    <div className={`p-5 font-sans mx-auto ${compareMode ? 'max-w-[1400px]' : 'max-w-[1200px]'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold">UK Tax Calculator</h1>
          <p className="text-gray-500 text-sm">{formatTaxYear(DEFAULT_TAX_YEAR)} Tax Year</p>
        </div>
        {activeTab === 'salary' && (
          <label className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={compareMode}
              onChange={e => setCompareMode(e.target.checked)}
              className="w-[18px] h-[18px]"
            />
            <span className="font-medium text-sm">Compare Scenarios</span>
          </label>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        <button className={tabCls(activeTab === 'salary')} onClick={() => setActiveTab('salary')}>
          Salary Calculator
        </button>
        <button className={tabCls(activeTab === 'house')} onClick={() => setActiveTab('house')}>
          House Purchase
        </button>
        <button className={tabCls(activeTab === 'projections')} onClick={() => setActiveTab('projections')}>
          Projections
        </button>
        <button className={tabCls(activeTab === 'budget')} onClick={() => setActiveTab('budget')}>
          Budget
        </button>
        <button className={tabCls(activeTab === 'maternity')} onClick={() => setActiveTab('maternity')}>
          Maternity &amp; Paternity
        </button>
      </div>

      {/* Salary Tab */}
      {activeTab === 'salary' && (
        <SalaryTab
          salary={salary}
          setSalary={setSalary}
          companyCar={companyCar}
          setCompanyCar={setCompanyCar}
          bonus={bonus}
          setBonus={setBonus}
          children={children}
          setChildren={setChildren}
          scenarioB={scenarioB}
          setScenarioB={setScenarioB}
          partner2={partner2}
          setPartner2={setPartner2}
          compareMode={compareMode}
          mortgageMaxOverride={house.mortgageMaxOverride}
          useGrossForMortgage={house.useGrossForMortgage}
          resultA={resultA}
          resultB={resultB}
          resultP2={resultP2}
          adjA={adjA}
          adjB={adjB}
        />
      )}

      {/* House Purchase Tab */}
      {activeTab === 'house' && (
        <HousePurchaseTab
          house={house}
          setHouse={setHouse}
          grossSalary={salary.grossSalary}
          adjustedAnnual={adjA.adjustedAnnual}
          taxRegion={salary.taxRegion}
          setTaxRegion={(r: TaxRegion) => setSalary(prev => ({ ...prev, taxRegion: r }))}
          resultA={resultA}
        />
      )}

      {/* Projections Tab */}
      {activeTab === 'projections' && (
        <ProjectionsTab
          baseSalary={salary.grossSalary}
          taxRegion={salary.taxRegion}
          employeePensionPercentage={salary.employeePensionPercentage}
          employerPensionPercentage={salary.employerPensionPercentage}
          currentAge={salary.currentAge}
          retirementAge={salary.retirementAge}
          hasChildren={children.hasChildren}
          numberOfChildren={children.numberOfChildren}
          bonusAmount={bonus.bonusAmount}
          bonusSacrificePercentage={bonus.bonusSacrificePercentage}
          hasCompanyCar={companyCar.hasCompanyCar}
          carSalarySacrifice={companyCar.carSalarySacrifice}
          carP11DValue={companyCar.carP11DValue}
          carBIKPercentage={companyCar.carBIKPercentage}
          studentLoanPlan={salary.studentLoanPlan ?? 'none'}
          hasPostgradLoan={salary.hasPostgradLoan ?? false}
        />
      )}

      {/* Maternity & Paternity Tab */}
      {activeTab === 'maternity' && (
        <MaternityTab
          maternity={maternity}
          setMaternity={setMaternity}
          salary={salary}
          children={children}
        />
      )}

      {/* Budget Tab */}
      {activeTab === 'budget' && (
        <BudgetingTab
          yourMonthlyTakeHome={adjA.adjustedMonthly}
          partnerMonthlyTakeHome={(resultA.housePurchase?.partnerAnnualTakeHome ?? 0) / 12}
          mortgageMonthlyRepayment={resultA.housePurchase?.monthlyRepayment ?? 0}
          mortgagePrincipal={resultA.housePurchase?.mortgageNeeded ?? 0}
          mortgageRate={house.mortgageInterestRate}
          mortgageTerm={house.mortgageTerm}
          expenses={budget.expenses}
          setExpenses={v => updateBudget({ expenses: v })}
          partner2TakeHome={budget.partner2TakeHome}
          setPartner2TakeHome={v => updateBudget({ partner2TakeHome: v })}
          jointContrib1={budget.jointContrib1}
          setJointContrib1={v => updateBudget({ jointContrib1: v })}
          jointContrib2={budget.jointContrib2}
          setJointContrib2={v => updateBudget({ jointContrib2: v })}
          mortgageOverride={budget.mortgageOverride}
          setMortgageOverride={v => updateBudget({ mortgageOverride: v })}
          useMortgageOverride={budget.useMortgageOverride}
          setUseMortgageOverride={v => updateBudget({ useMortgageOverride: v })}
          projectionYears={budget.projectionYears}
          setProjectionYears={v => updateBudget({ projectionYears: v })}
          savingsGrowthRate={budget.savingsGrowthRate}
          setSavingsGrowthRate={v => updateBudget({ savingsGrowthRate: v })}
        />
      )}
    </div>
  );
}

export default App;
