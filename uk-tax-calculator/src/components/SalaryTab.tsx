import { useState } from 'react';
import type { CalculationResults } from '../types/scenario';
import type { TaxRegion } from '../data/taxRates2025';
import type {
  SalaryState,
  CompanyCarState,
  BonusState,
  ChildrenState,
  ScenarioBState,
} from '../types/appState';
import { getTaxBreakdown } from '../lib/calculator';
import { formatCurrency, safeNumber } from '../lib/utils/formatters';
import { CompareRow } from './CompareRow';

interface AdjustedValues {
  effectiveCharge: number;
  adjustedAnnual: number;
  adjustedMonthly: number;
  effectiveMonthly: number;
  hasTaxFreeChildcareBenefit: boolean;
  taxFreeChildcareBenefitAmount: number;
}

interface SalaryTabProps {
  // State
  salary: SalaryState;
  setSalary: (s: SalaryState | ((prev: SalaryState) => SalaryState)) => void;
  companyCar: CompanyCarState;
  setCompanyCar: (s: CompanyCarState | ((prev: CompanyCarState) => CompanyCarState)) => void;
  bonus: BonusState;
  setBonus: (s: BonusState | ((prev: BonusState) => BonusState)) => void;
  children: ChildrenState;
  setChildren: (s: ChildrenState | ((prev: ChildrenState) => ChildrenState)) => void;
  scenarioB: ScenarioBState;
  setScenarioB: (s: ScenarioBState | ((prev: ScenarioBState) => ScenarioBState)) => void;
  compareMode: boolean;
  mortgageMaxOverride: number;
  useGrossForMortgage: boolean;
  // Computed results
  resultA: CalculationResults;
  resultB: CalculationResults | null;
  adjA: AdjustedValues;
  adjB: AdjustedValues | null;
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm box-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const inputClsB = `${inputCls} border-blue-600`;
const labelCls = 'block mb-1 font-medium text-gray-700 text-sm';
const fieldCls = 'mb-3';
const sectionCls = 'bg-gray-50 p-4 rounded-lg mb-4';
const sectionHeaderCls = 'flex items-center gap-2 mb-3 text-base font-semibold';

export function SalaryTab({
  salary, setSalary,
  companyCar, setCompanyCar,
  bonus, setBonus,
  children, setChildren,
  scenarioB, setScenarioB,
  compareMode,
  mortgageMaxOverride,
  useGrossForMortgage,
  resultA, resultB,
  adjA, adjB,
}: SalaryTabProps) {
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  // Helpers to update nested state
  const updateSalary = (updates: Partial<SalaryState>) => setSalary(prev => ({ ...prev, ...updates }));
  const updateCar = (updates: Partial<CompanyCarState>) => setCompanyCar(prev => ({ ...prev, ...updates }));
  const updateBonus = (updates: Partial<BonusState>) => setBonus(prev => ({ ...prev, ...updates }));
  const updateChildren = (updates: Partial<ChildrenState>) => setChildren(prev => ({ ...prev, ...updates }));
  const updateBCar = (updates: Partial<CompanyCarState>) => setScenarioB(prev => ({ ...prev, companyCar: { ...prev.companyCar, ...updates } }));
  const updateBBonus = (updates: Partial<BonusState>) => setScenarioB(prev => ({ ...prev, bonus: { ...prev.bonus, ...updates } }));
  const updateB = (updates: Partial<ScenarioBState>) => setScenarioB(prev => ({ ...prev, ...updates }));

  return (
    <div className={`grid gap-6 ${compareMode ? 'grid-cols-[400px_1fr]' : 'grid-cols-1 md:grid-cols-[400px_1fr]'}`}>
      {/* Input Form */}
      <div>
        {/* Income & Pension */}
        <div className={sectionCls}>
          <h2 className={sectionHeaderCls}>Income & Pension</h2>

          {compareMode ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Scenario A</div>
                <div className={fieldCls}>
                  <label className={labelCls}>Gross Salary</label>
                  <input type="number" value={salary.grossSalary} onChange={e => updateSalary({ grossSalary: safeNumber(e.target.value) })} className={inputCls} />
                </div>
                <div className={fieldCls}>
                  <label className={labelCls}>Your Pension %</label>
                  <input type="number" value={salary.employeePensionPercentage} onChange={e => updateSalary({ employeePensionPercentage: safeNumber(e.target.value) })} className={inputCls} min="0" max="100" />
                </div>
              </div>
              <div>
                <div className="text-xs text-blue-600 mb-1">Scenario B</div>
                <div className={fieldCls}>
                  <label className={labelCls}>Gross Salary</label>
                  <input type="number" value={scenarioB.grossSalary} onChange={e => updateB({ grossSalary: safeNumber(e.target.value) })} className={inputClsB} />
                </div>
                <div className={fieldCls}>
                  <label className={labelCls}>Your Pension %</label>
                  <input type="number" value={scenarioB.employeePensionPercentage} onChange={e => updateB({ employeePensionPercentage: safeNumber(e.target.value) })} className={inputClsB} min="0" max="100" />
                </div>
              </div>
            </div>
          ) : (
            <div className={fieldCls}>
              <label className={labelCls}>Annual Gross Salary</label>
              <input type="number" value={salary.grossSalary} onChange={e => updateSalary({ grossSalary: safeNumber(e.target.value) })} className={inputCls} />
            </div>
          )}

          <div className={fieldCls}>
            <label className={labelCls}>Tax Region</label>
            <select value={salary.taxRegion} onChange={e => updateSalary({ taxRegion: e.target.value as TaxRegion })} className={inputCls}>
              <option value="scotland">Scotland</option>
              <option value="england">England & Wales</option>
            </select>
          </div>

          {!compareMode && (
            <div className="grid grid-cols-2 gap-3">
              <div className={fieldCls}>
                <label className={labelCls}>Your Pension %</label>
                <input type="number" value={salary.employeePensionPercentage} onChange={e => updateSalary({ employeePensionPercentage: safeNumber(e.target.value) })} className={inputCls} min="0" max="100" />
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>Employer Pension %</label>
                <input type="number" value={salary.employerPensionPercentage} onChange={e => updateSalary({ employerPensionPercentage: safeNumber(e.target.value) })} className={inputCls} min="0" max="100" />
              </div>
            </div>
          )}

          {compareMode && (
            <div className={fieldCls}>
              <label className={labelCls}>Employer Pension % (both)</label>
              <input type="number" value={salary.employerPensionPercentage} onChange={e => updateSalary({ employerPensionPercentage: safeNumber(e.target.value) })} className={inputCls} min="0" max="100" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className={fieldCls}>
              <label className={labelCls}>Current Age</label>
              <input type="number" value={salary.currentAge} onChange={e => updateSalary({ currentAge: safeNumber(e.target.value, 35) })} className={inputCls} min="18" max="100" />
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Retirement Age</label>
              <input type="number" value={salary.retirementAge} onChange={e => updateSalary({ retirementAge: safeNumber(e.target.value, 65) })} className={inputCls} min="50" max="100" />
            </div>
          </div>
        </div>

        {/* Company Car */}
        <div className={sectionCls}>
          <h2 className={sectionHeaderCls}>Company Car (Salary Sacrifice)</h2>

          {compareMode ? (
            <div className="grid grid-cols-2 gap-3">
              {/* Scenario A */}
              <div>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input type="checkbox" checked={companyCar.hasCompanyCar} onChange={e => updateCar({ hasCompanyCar: e.target.checked })} className="w-4 h-4" />
                  <span className="text-xs text-gray-500">Scenario A</span>
                </label>
                {companyCar.hasCompanyCar && (
                  <>
                    <div className={fieldCls}>
                      <label className={labelCls}>Monthly Sacrifice</label>
                      <input type="number" value={companyCar.carSalarySacrifice} onChange={e => updateCar({ carSalarySacrifice: safeNumber(e.target.value) })} className={inputCls} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls}>P11D Value</label>
                      <input type="number" value={companyCar.carP11DValue} onChange={e => updateCar({ carP11DValue: safeNumber(e.target.value) })} className={inputCls} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls}>BIK Rate (%)</label>
                      <input type="number" value={companyCar.carBIKPercentage} onChange={e => updateCar({ carBIKPercentage: safeNumber(e.target.value, 2) })} className={inputCls} min="0" max="37" />
                    </div>
                  </>
                )}
              </div>
              {/* Scenario B */}
              <div>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input type="checkbox" checked={scenarioB.companyCar.hasCompanyCar} onChange={e => updateBCar({ hasCompanyCar: e.target.checked })} className="w-4 h-4" />
                  <span className="text-xs text-blue-600">Scenario B</span>
                </label>
                {scenarioB.companyCar.hasCompanyCar && (
                  <>
                    <div className={fieldCls}>
                      <label className={labelCls}>Monthly Sacrifice</label>
                      <input type="number" value={scenarioB.companyCar.carSalarySacrifice} onChange={e => updateBCar({ carSalarySacrifice: safeNumber(e.target.value) })} className={inputClsB} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls}>P11D Value</label>
                      <input type="number" value={scenarioB.companyCar.carP11DValue} onChange={e => updateBCar({ carP11DValue: safeNumber(e.target.value) })} className={inputClsB} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls}>BIK Rate (%)</label>
                      <input type="number" value={scenarioB.companyCar.carBIKPercentage} onChange={e => updateBCar({ carBIKPercentage: safeNumber(e.target.value, 2) })} className={inputClsB} min="0" max="37" />
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input type="checkbox" checked={companyCar.hasCompanyCar} onChange={e => updateCar({ hasCompanyCar: e.target.checked })} className="w-[18px] h-[18px]" />
                <span>Enable Company Car</span>
              </label>
              {companyCar.hasCompanyCar && (
                <>
                  <div className={fieldCls}>
                    <label className={labelCls}>Monthly Salary Sacrifice</label>
                    <input type="number" value={companyCar.carSalarySacrifice} onChange={e => updateCar({ carSalarySacrifice: safeNumber(e.target.value) })} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={fieldCls}>
                      <label className={labelCls}>Car P11D Value</label>
                      <input type="number" value={companyCar.carP11DValue} onChange={e => updateCar({ carP11DValue: safeNumber(e.target.value) })} className={inputCls} />
                    </div>
                    <div className={fieldCls}>
                      <label className={labelCls}>BIK Rate (%)</label>
                      <input type="number" value={companyCar.carBIKPercentage} onChange={e => updateCar({ carBIKPercentage: safeNumber(e.target.value, 2) })} className={inputCls} min="0" max="37" />
                      <span className="text-[11px] text-gray-500">2% for EVs</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Children */}
        <div className={sectionCls}>
          <div className={sectionHeaderCls}>
            <input type="checkbox" checked={children.hasChildren} onChange={e => updateChildren({ hasChildren: e.target.checked })} className="w-[18px] h-[18px]" />
            <span>Children</span>
          </div>

          {children.hasChildren && (
            <>
              <div className={fieldCls}>
                <label className={labelCls}>Number of Children</label>
                <input type="number" value={children.numberOfChildren} onChange={e => updateChildren({ numberOfChildren: safeNumber(e.target.value, 1) })} className={inputCls} min="1" max="10" />
              </div>

              {compareMode ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Scenario A</div>
                    <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={children.claimsChildBenefitA} onChange={e => updateChildren({ claimsChildBenefitA: e.target.checked })} />
                      Claims Child Benefit
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={children.usesTaxFreeChildcareA} onChange={e => updateChildren({ usesTaxFreeChildcareA: e.target.checked })} />
                      Tax-Free Childcare
                    </label>
                  </div>
                  <div>
                    <div className="text-xs text-blue-600 mb-2">Scenario B</div>
                    <label className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={children.claimsChildBenefitB} onChange={e => updateChildren({ claimsChildBenefitB: e.target.checked })} />
                      Claims Child Benefit
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={children.usesTaxFreeChildcareB} onChange={e => updateChildren({ usesTaxFreeChildcareB: e.target.checked })} />
                      Tax-Free Childcare
                    </label>
                  </div>
                </div>
              ) : (
                <>
                  <label className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={children.claimsChildBenefitA} onChange={e => updateChildren({ claimsChildBenefitA: e.target.checked })} />
                    Claiming Child Benefit
                  </label>
                  <div className={fieldCls}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={children.usesTaxFreeChildcareA} onChange={e => updateChildren({ usesTaxFreeChildcareA: e.target.checked })} />
                      Using Tax-Free Childcare
                    </label>
                    <span className="text-[11px] text-gray-500 block mt-1">
                      £2k/year per child (lost if ANI &gt; £100k)
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Bonus */}
        <div className={sectionCls}>
          <h2 className={sectionHeaderCls}>Bonus</h2>
          {compareMode ? (
            <div className="grid grid-cols-2 gap-3">
              <BonusSection label="Scenario A" labelColor="text-gray-500" inputClass={inputCls} bonus={bonus} onUpdate={updateBonus} result={resultA} />
              <BonusSection label="Scenario B" labelColor="text-blue-600" inputClass={inputClsB} bonus={scenarioB.bonus} onUpdate={updateBBonus} result={resultB ?? resultA} />
            </div>
          ) : (
            <BonusSection inputClass={inputCls} bonus={bonus} onUpdate={updateBonus} result={resultA} showHelp />
          )}
        </div>
      </div>

      {/* Results */}
      <div>
        {/* Tax Breakdown */}
        <div className="bg-blue-50 p-5 rounded-lg">
          <h2 className="mb-4 text-lg font-semibold">
            Tax Breakdown ({salary.taxRegion === 'scotland' ? 'Scotland' : 'England'})
          </h2>

          <table className="w-full border-collapse">
            <thead>
              {compareMode && (
                <tr className="border-b border-gray-300">
                  <th className="text-left py-1.5 font-semibold"></th>
                  <th className="text-right py-1.5 font-semibold text-gray-700">A ({salary.employeePensionPercentage}%)</th>
                  <th className="text-right py-1.5 font-semibold text-blue-600">B ({scenarioB.employeePensionPercentage}%)</th>
                  <th className="text-right py-1.5 font-semibold text-gray-500">Diff</th>
                </tr>
              )}
            </thead>
            <tbody>
              <CompareRow label="Gross Salary" valueA={resultA.grossSalary} valueB={resultB?.grossSalary ?? null} compareMode={compareMode} />
              {resultA.bonusAmount > 0 && (
                <CompareRow label={resultA.bonusSacrificedToPension > 0 ? 'Bonus (sacrificed)' : 'Bonus'} valueA={resultA.bonusAmount} valueB={resultB?.bonusAmount ?? null} compareMode={compareMode} />
              )}
              <CompareRow label="Employee Pension" valueA={resultA.employeePension} valueB={resultB?.employeePension ?? null} compareMode={compareMode} isDeduction />
              {(resultA.carSalarySacrifice > 0 || (resultB?.carSalarySacrifice ?? 0) > 0) && (
                <CompareRow label="Car Salary Sacrifice" valueA={resultA.carSalarySacrifice} valueB={resultB?.carSalarySacrifice ?? null} compareMode={compareMode} isDeduction />
              )}

              {/* Income Tax (expandable) */}
              <tr className="cursor-pointer hover:bg-blue-100/50" onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}>
                <td className="py-1.5">
                  <span className="mr-1.5">{showTaxBreakdown ? '\u25BC' : '\u25B6'}</span>
                  Income Tax
                </td>
                <td className="text-right text-red-600">-{formatCurrency(resultA.incomeTax)}</td>
                {compareMode && resultB && (
                  <>
                    <td className="text-right text-red-600">-{formatCurrency(resultB.incomeTax)}</td>
                    <td className={`text-right text-[13px] ${resultB.incomeTax - resultA.incomeTax < 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {resultB.incomeTax - resultA.incomeTax !== 0 && (
                        <>{resultB.incomeTax - resultA.incomeTax > 0 ? '+' : ''}{formatCurrency(resultB.incomeTax - resultA.incomeTax)}</>
                      )}
                    </td>
                  </>
                )}
              </tr>

              {showTaxBreakdown && (() => {
                const breakdownA = getTaxBreakdown(resultA.taxableIncome, salary.taxRegion);
                const breakdownB = resultB ? getTaxBreakdown(resultB.taxableIncome, salary.taxRegion) : null;
                return breakdownA.map((bracket, idx) => (
                  <tr key={idx} className="bg-gray-50 text-xs">
                    <td className="py-0.5 pl-5 text-gray-500">
                      {bracket.bandName} ({bracket.rate}%)
                      <span className="text-gray-400 ml-1">
                        £{bracket.min.toLocaleString()}{bracket.max ? ` - £${bracket.max.toLocaleString()}` : '+'}
                      </span>
                    </td>
                    <td className={`text-right ${bracket.taxInBand > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {bracket.taxInBand > 0 ? `-${formatCurrency(bracket.taxInBand)}` : '-'}
                    </td>
                    {compareMode && breakdownB && (
                      <>
                        <td className="text-right text-gray-500">
                          {breakdownB[idx] && breakdownB[idx].taxInBand > 0 ? `-${formatCurrency(breakdownB[idx].taxInBand)}` : '-'}
                        </td>
                        <td></td>
                      </>
                    )}
                  </tr>
                ));
              })()}

              <CompareRow label="National Insurance" valueA={resultA.nationalInsurance} valueB={resultB?.nationalInsurance ?? null} compareMode={compareMode} isDeduction />
              {(resultA.bikTax > 0 || (resultB?.bikTax ?? 0) > 0) && (
                <CompareRow label="BIK Tax" valueA={resultA.bikTax} valueB={resultB?.bikTax ?? null} compareMode={compareMode} isDeduction />
              )}
              {(adjA.effectiveCharge > 0 || (adjB?.effectiveCharge ?? 0) > 0) && (
                <CompareRow label="Child Benefit Charge" valueA={adjA.effectiveCharge} valueB={adjB?.effectiveCharge ?? null} compareMode={compareMode} isDeduction />
              )}

              {/* Annual & Monthly take-home */}
              <tr className="border-t-2 border-gray-700">
                <td className="py-3 font-bold">Annual Take-Home</td>
                <td className="text-right text-emerald-600 text-lg font-bold">{formatCurrency(adjA.adjustedAnnual)}</td>
                {compareMode && adjB && (
                  <>
                    <td className="text-right text-emerald-600 text-lg font-bold">{formatCurrency(adjB.adjustedAnnual)}</td>
                    <td className={`text-right font-bold ${adjB.adjustedAnnual - adjA.adjustedAnnual > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {adjB.adjustedAnnual - adjA.adjustedAnnual > 0 ? '+' : ''}{formatCurrency(adjB.adjustedAnnual - adjA.adjustedAnnual)}
                    </td>
                  </>
                )}
              </tr>
              <tr>
                <td className="py-1.5">Monthly Take-Home</td>
                <td className="text-right text-emerald-600 font-bold">{formatCurrency(adjA.adjustedMonthly)}</td>
                {compareMode && adjB && (
                  <>
                    <td className="text-right text-emerald-600 font-bold">{formatCurrency(adjB.adjustedMonthly)}</td>
                    <td className={`text-right ${adjB.adjustedMonthly - adjA.adjustedMonthly > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {adjB.adjustedMonthly - adjA.adjustedMonthly > 0 ? '+' : ''}{formatCurrency(adjB.adjustedMonthly - adjA.adjustedMonthly)}
                    </td>
                  </>
                )}
              </tr>

              {/* Monthly breakdown */}
              <tr className="border-t border-gray-300 bg-gray-100">
                <td colSpan={compareMode ? 4 : 1} className="py-2 text-xs text-gray-500 font-semibold">Monthly Breakdown (for comparison)</td>
              </tr>
              <MonthlyRow label="Monthly Gross" valueA={resultA.grossSalary / 12} valueB={resultB ? resultB.grossSalary / 12 : null} compareMode={compareMode} />
              <MonthlyRow label="Monthly Income Tax" valueA={resultA.incomeTax / 12} valueB={resultB ? resultB.incomeTax / 12 : null} compareMode={compareMode} />
              <MonthlyRow label="Monthly NI" valueA={resultA.nationalInsurance / 12} valueB={resultB ? resultB.nationalInsurance / 12 : null} compareMode={compareMode} />

              {/* Tax-Free Childcare benefit rows */}
              {(adjA.hasTaxFreeChildcareBenefit || adjB?.hasTaxFreeChildcareBenefit) && (
                <>
                  <tr className="bg-green-100">
                    <td className="py-1.5 text-green-800">Tax-Free Childcare Benefit (monthly)</td>
                    <td className={`text-right ${adjA.hasTaxFreeChildcareBenefit ? 'text-green-800' : 'text-gray-500'}`}>
                      {adjA.hasTaxFreeChildcareBenefit ? `+${formatCurrency(adjA.taxFreeChildcareBenefitAmount / 12)}` : '-'}
                    </td>
                    {compareMode && adjB && (
                      <>
                        <td className={`text-right ${adjB.hasTaxFreeChildcareBenefit ? 'text-green-800' : 'text-gray-500'}`}>
                          {adjB.hasTaxFreeChildcareBenefit ? `+${formatCurrency(adjB.taxFreeChildcareBenefitAmount / 12)}` : '-'}
                        </td>
                        <td></td>
                      </>
                    )}
                  </tr>
                  <tr className="font-bold bg-green-100">
                    <td className="py-1.5 text-green-800">Effective Annual Cash</td>
                    <td className="text-right text-green-800 text-base">{formatCurrency(adjA.effectiveMonthly * 12)}</td>
                    {compareMode && adjB && (
                      <>
                        <td className="text-right text-green-800 text-base">{formatCurrency(adjB.effectiveMonthly * 12)}</td>
                        <td className={`text-right ${(adjB.effectiveMonthly - adjA.effectiveMonthly) * 12 > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {(adjB.effectiveMonthly - adjA.effectiveMonthly) * 12 > 0 ? '+' : ''}{formatCurrency((adjB.effectiveMonthly - adjA.effectiveMonthly) * 12)}
                        </td>
                      </>
                    )}
                  </tr>
                  <tr className="bg-green-100">
                    <td className="py-1.5 text-green-800">Effective Monthly Cash</td>
                    <td className="text-right text-green-800">{formatCurrency(adjA.effectiveMonthly)}</td>
                    {compareMode && adjB && (
                      <>
                        <td className="text-right text-green-800">{formatCurrency(adjB.effectiveMonthly)}</td>
                        <td className={`text-right ${adjB.effectiveMonthly - adjA.effectiveMonthly > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {adjB.effectiveMonthly - adjA.effectiveMonthly > 0 ? '+' : ''}{formatCurrency(adjB.effectiveMonthly - adjA.effectiveMonthly)}
                        </td>
                      </>
                    )}
                  </tr>
                </>
              )}
            </tbody>
          </table>

          <div className="mt-4 pt-3 border-t border-gray-300 text-[13px] text-gray-500">
            <div>ANI: {formatCurrency(resultA.adjustedNetIncome)}{compareMode && resultB && ` \u2192 ${formatCurrency(resultB.adjustedNetIncome)}`}</div>
          </div>
        </div>

        {/* Tax Rates & Headroom */}
        <div className="bg-purple-50 p-5 rounded-lg mt-4">
          <h3 className="mb-3 text-base font-semibold text-violet-600">Tax Rates</h3>
          {compareMode && resultB ? (
            <div className="grid grid-cols-2 gap-4">
              <TaxRateCard label="Scenario A" bgClass="bg-purple-100" labelColor="text-gray-700" result={resultA} />
              <TaxRateCard label="Scenario B" bgClass="bg-blue-100" labelColor="text-blue-600" result={resultB} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Effective Tax Rate</div>
                <div className="text-2xl font-bold text-violet-600">{resultA.effectiveTaxRate.toFixed(1)}%</div>
                <div className="text-[11px] text-gray-500">Total deductions as % of gross</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Marginal Rate</div>
                <div className="text-2xl font-bold text-red-600">{resultA.combinedMarginalRate}%</div>
                <div className="text-[11px] text-gray-500">Tax {resultA.marginalTaxRate}% + NI {resultA.marginalNIRate}%</div>
              </div>
            </div>
          )}

          {resultA.headroom.length > 0 && (
            <div className="mt-4 pt-3 border-t border-purple-200">
              <div className="text-[13px] font-semibold text-violet-600 mb-2">Headroom to Key Thresholds</div>
              <div className="flex flex-col gap-1.5">
                {resultA.headroom.filter(h => h.headroom > 0).slice(0, 4).map((h, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-gray-500">{h.name}</span>
                    <span className={`font-medium ${h.headroom < 5000 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatCurrency(h.headroom)} left
                      {h.marginalRateIfExceeded && <span className="text-gray-500"> (then ~{h.marginalRateIfExceeded}%)</span>}
                    </span>
                  </div>
                ))}
                {resultA.headroom.filter(h => h.headroom <= 0).slice(0, 2).map((h, idx) => (
                  <div key={`over-${idx}`} className="flex justify-between text-xs text-red-600">
                    <span>{h.name}</span>
                    <span className="font-medium">{formatCurrency(Math.abs(h.headroom))} over {h.warning && `- ${h.warning}`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pension Projections */}
        <div className="bg-green-50 p-5 rounded-lg mt-4">
          <h3 className="mb-3 text-base font-semibold text-green-800">Pension Projections</h3>
          <table className="w-full">
            <tbody>
              <CompareRow label="Annual contribution (you + employer)" valueA={resultA.totalPensionContribution} valueB={resultB?.totalPensionContribution ?? null} compareMode={compareMode} />
              <CompareRow label="Pot after 5 years (5% growth)" valueA={resultA.pensionPotAt5Years} valueB={resultB?.pensionPotAt5Years ?? null} compareMode={compareMode} />
              <CompareRow label={`Pot at retirement (${salary.retirementAge - salary.currentAge}yr)`} valueA={resultA.pensionPotAtRetirement} valueB={resultB?.pensionPotAtRetirement ?? null} compareMode={compareMode} />
            </tbody>
          </table>
        </div>

        {/* Mortgage Capacity */}
        <div className="bg-amber-100 p-5 rounded-lg mt-4">
          <h3 className="mb-3 text-base font-semibold text-amber-800">Mortgage Capacity</h3>
          <table className="w-full">
            <tbody>
              <CompareRow
                label={`Max mortgage${mortgageMaxOverride > 0 ? ' (override)' : useGrossForMortgage ? ' (4.5x gross)' : ' (4.5x take-home)'}`}
                valueA={resultA.housePurchase?.maxMortgageCapacity ?? resultA.maxMortgageCapacity}
                valueB={resultB?.housePurchase?.maxMortgageCapacity ?? resultB?.maxMortgageCapacity ?? null}
                compareMode={compareMode}
              />
            </tbody>
          </table>
          <div className="mt-3 text-[13px] text-amber-800">See the House Purchase tab for full affordability analysis</div>
        </div>

        {/* Warnings */}
        {resultA.cliffEdgeWarnings.length > 0 && (
          <div className="bg-red-50 p-5 rounded-lg mt-4">
            <h3 className="mb-3 text-base font-semibold text-red-800">Cliff Edge Warnings</h3>
            {resultA.cliffEdgeWarnings.map((warning, idx) => (
              <div key={idx} className="text-red-800 mb-2 text-sm">{warning}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function MonthlyRow({ label, valueA, valueB, compareMode }: { label: string; valueA: number; valueB: number | null; compareMode: boolean }) {
  return (
    <tr className="bg-gray-100">
      <td className="py-1 text-[13px] text-gray-500">{label}</td>
      <td className="text-right text-[13px] text-gray-500">{formatCurrency(valueA)}</td>
      {compareMode && valueB !== null && (
        <>
          <td className="text-right text-[13px] text-gray-500">{formatCurrency(valueB)}</td>
          <td></td>
        </>
      )}
    </tr>
  );
}

function BonusSection({ label, labelColor, inputClass, bonus, onUpdate, result, showHelp }: {
  label?: string;
  labelColor?: string;
  inputClass: string;
  bonus: BonusState;
  onUpdate: (updates: Partial<BonusState>) => void;
  result: CalculationResults;
  showHelp?: boolean;
}) {
  return (
    <div>
      {label && <div className={`text-xs ${labelColor} mb-1`}>{label}</div>}
      <div className={fieldCls}>
        <label className={labelCls}>Bonus Amount</label>
        <input type="number" value={bonus.bonusAmount} onChange={e => onUpdate({ bonusAmount: safeNumber(e.target.value) })} className={inputClass} />
      </div>
      {bonus.bonusAmount > 0 && (
        <div className={fieldCls}>
          <label className={labelCls}>Sacrifice to Pension: {bonus.bonusSacrificePercentage}%</label>
          <input type="range" min="0" max="100" step="5" value={bonus.bonusSacrificePercentage} onChange={e => onUpdate({ bonusSacrificePercentage: safeNumber(e.target.value) })} className="w-full" />
          <div className="flex justify-between text-[11px] text-gray-500">
            <span>0%</span>
            <span>100%</span>
          </div>
          {showHelp && <span className="text-[11px] text-gray-500">Saves tax and NI, reduces ANI</span>}
          {bonus.bonusSacrificePercentage > 0 && (
            <div className="bg-green-50 p-2 rounded mt-2 text-xs">
              <div className="text-green-800 font-bold">
                Sacrificing: {formatCurrency(bonus.bonusAmount * bonus.bonusSacrificePercentage / 100)} {showHelp && `\u2192 Tax saved: ~${formatCurrency(bonus.bonusAmount * bonus.bonusSacrificePercentage / 100 * (result.combinedMarginalRate / 100))}`}
              </div>
              {showHelp && <div className="text-gray-500">Added to pension pot instead</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaxRateCard({ label, bgClass, labelColor, result }: {
  label: string;
  bgClass: string;
  labelColor: string;
  result: CalculationResults;
}) {
  return (
    <div className={`${bgClass} p-3 rounded-md`}>
      <div className={`text-xs ${labelColor} mb-2 font-semibold`}>{label}</div>
      <div className="flex justify-between mb-2">
        <div>
          <div className="text-[11px] text-gray-500">Effective</div>
          <div className="text-xl font-bold text-violet-600">{result.effectiveTaxRate.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-[11px] text-gray-500">Marginal</div>
          <div className="text-xl font-bold text-red-600">{result.combinedMarginalRate}%</div>
        </div>
      </div>
      <div className="text-[10px] text-gray-500">Tax {result.marginalTaxRate}% + NI {result.marginalNIRate}%</div>
    </div>
  );
}
