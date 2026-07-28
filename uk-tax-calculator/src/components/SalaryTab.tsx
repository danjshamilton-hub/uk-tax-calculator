import { useState } from 'react';
import type { CalculationResults } from '../types/scenario';
import type {
  SalaryState,
  CompanyCarState,
  BonusState,
  ChildrenState,
  ScenarioBState,
  Partner2State,
} from '../types/appState';
import { getTaxBreakdown } from '../lib/calculator';
import { getStudentLoanPlans, DEFAULT_TAX_YEAR } from '../data/taxYears';
import { formatCurrency, safeNumber } from '../lib/utils/formatters';
import { CompareRow } from './CompareRow';
import { CollapsibleSection } from './CollapsibleSection';
import { PersonInputs } from './PersonInputs';

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
  partner2: Partner2State;
  setPartner2: (s: Partner2State | ((prev: Partner2State) => Partner2State)) => void;
  compareMode: boolean;
  mortgageMaxOverride: number;
  useGrossForMortgage: boolean;
  // Computed results
  resultA: CalculationResults;
  resultB: CalculationResults | null;
  resultP2: CalculationResults | null;
  adjA: AdjustedValues;
  adjB: AdjustedValues | null;
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm box-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
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
  partner2, setPartner2,
  compareMode,
  mortgageMaxOverride,
  useGrossForMortgage,
  resultA, resultB, resultP2,
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

  // Partner 2 updaters, mirroring Partner 1's
  const updatePartner2 = (updates: Partial<Partner2State>) => setPartner2(prev => ({ ...prev, ...updates }));
  const updateP2Car = (updates: Partial<CompanyCarState>) => setPartner2(prev => ({ ...prev, companyCar: { ...prev.companyCar, ...updates } }));
  const updateP2Bonus = (updates: Partial<BonusState>) => setPartner2(prev => ({ ...prev, bonus: { ...prev.bonus, ...updates } }));
  const updateP2B = (updates: Partial<ScenarioBState>) => setPartner2(prev => ({ ...prev, scenarioB: { ...prev.scenarioB, ...updates } }));
  const updateP2BCar = (updates: Partial<CompanyCarState>) => setPartner2(prev => ({ ...prev, scenarioB: { ...prev.scenarioB, companyCar: { ...prev.scenarioB.companyCar, ...updates } } }));
  const updateP2BBonus = (updates: Partial<BonusState>) => setPartner2(prev => ({ ...prev, scenarioB: { ...prev.scenarioB, bonus: { ...prev.scenarioB.bonus, ...updates } } }));

  return (
    <div className={`grid gap-6 ${compareMode ? 'grid-cols-[400px_1fr]' : 'grid-cols-1 md:grid-cols-[400px_1fr]'}`}>
      {/* Input Form */}
      {/* Input Form */}
      <div>
        {/* ─── Partner 1 ─── */}
        <CollapsibleSection
          title="Partner 1"
          summary={formatCurrency(salary.grossSalary)}
          defaultOpen
        >
          <PersonInputs
            values={{
              grossSalary: salary.grossSalary,
              employeePensionPercentage: salary.employeePensionPercentage,
              employerPensionPercentage: salary.employerPensionPercentage,
              companyCar,
              bonus,
            }}
            onChange={u => updateSalary(u)}
            onCarChange={updateCar}
            onBonusChange={updateBonus}
            personal={{
              taxRegion: salary.taxRegion,
              currentAge: salary.currentAge,
              retirementAge: salary.retirementAge,
              studentLoanPlan: salary.studentLoanPlan,
              hasPostgradLoan: salary.hasPostgradLoan,
              onChange: updateSalary,
            }}
          />
        </CollapsibleSection>

        {compareMode && (
          <CollapsibleSection
            title="Scenario B"
            summary={formatCurrency(scenarioB.grossSalary)}
            accent
            nested
          >
            <PersonInputs
              accent
              values={{
                grossSalary: scenarioB.grossSalary,
                employeePensionPercentage: scenarioB.employeePensionPercentage,
                employerPensionPercentage:
                  scenarioB.employerPensionPercentage ?? salary.employerPensionPercentage,
                companyCar: scenarioB.companyCar,
                bonus: scenarioB.bonus,
              }}
              onChange={updateB}
              onCarChange={updateBCar}
              onBonusChange={updateBBonus}
            />
            <p className="text-[11px] text-gray-500 mt-2">
              Region, ages and student loan are shared with Scenario A.
            </p>
          </CollapsibleSection>
        )}

        {/* ─── Partner 2 ─── */}
        <CollapsibleSection
          title="Partner 2"
          summary={partner2.enabled ? formatCurrency(partner2.grossSalary) : 'not added'}
          headerControl={
            <label className="flex items-center gap-2 text-[13px] cursor-pointer">
              <input
                type="checkbox"
                checked={partner2.enabled}
                onChange={e => updatePartner2({ enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-gray-600">Include</span>
            </label>
          }
        >
          {partner2.enabled ? (
            <PersonInputs
              values={{
                grossSalary: partner2.grossSalary,
                employeePensionPercentage: partner2.employeePensionPercentage,
                employerPensionPercentage: partner2.employerPensionPercentage,
                companyCar: partner2.companyCar,
                bonus: partner2.bonus,
              }}
              onChange={updatePartner2}
              onCarChange={updateP2Car}
              onBonusChange={updateP2Bonus}
              personal={{
                taxRegion: partner2.taxRegion,
                currentAge: partner2.currentAge,
                retirementAge: partner2.retirementAge,
                studentLoanPlan: partner2.studentLoanPlan,
                hasPostgradLoan: partner2.hasPostgradLoan,
                onChange: updatePartner2,
              }}
            />
          ) : (
            <p className="text-[13px] text-gray-500">
              Tick <em>Include</em> to add a second earner. Their figures feed the House
              Purchase, Budget and Maternity tabs.
            </p>
          )}
        </CollapsibleSection>

        {compareMode && partner2.enabled && (
          <CollapsibleSection
            title="Scenario B"
            summary={formatCurrency(partner2.scenarioB.grossSalary)}
            accent
            nested
          >
            <PersonInputs
              accent
              values={{
                grossSalary: partner2.scenarioB.grossSalary,
                employeePensionPercentage: partner2.scenarioB.employeePensionPercentage,
                employerPensionPercentage:
                  partner2.scenarioB.employerPensionPercentage ?? partner2.employerPensionPercentage,
                companyCar: partner2.scenarioB.companyCar,
                bonus: partner2.scenarioB.bonus,
              }}
              onChange={updateP2B}
              onCarChange={updateP2BCar}
              onBonusChange={updateP2BBonus}
            />
            <p className="text-[11px] text-gray-500 mt-2">
              Region, ages and student loan are shared with Scenario A.
            </p>
          </CollapsibleSection>
        )}

        {/* ─── Children (household-wide) ─── */}
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

        {/* ─── Household summary ─── */}
        {partner2.enabled && resultP2 && (
          <div className={`${sectionCls} !bg-emerald-50`}>
            <h2 className={sectionHeaderCls}>Household</h2>
            <table className="w-full text-[13px]">
              <tbody>
                <tr className="border-b border-emerald-200">
                  <td className="py-1.5">Partner 1 take-home</td>
                  <td className="py-1.5 text-right">{formatCurrency(adjA.adjustedAnnual)}</td>
                </tr>
                <tr className="border-b border-emerald-200">
                  <td className="py-1.5">Partner 2 take-home</td>
                  <td className="py-1.5 text-right">{formatCurrency(resultP2.annualTakeHome)}</td>
                </tr>
                <tr className="font-bold">
                  <td className="py-2">Combined</td>
                  <td className="py-2 text-right">
                    {formatCurrency(adjA.adjustedAnnual + resultP2.annualTakeHome)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-500">Per month</td>
                  <td className="py-1 text-right text-gray-500">
                    {formatCurrency((adjA.adjustedAnnual + resultP2.annualTakeHome) / 12)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
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
              {(resultA.carAllowance > 0 || (resultB?.carAllowance ?? 0) > 0) && (
                <CompareRow label="Car Allowance" valueA={resultA.carAllowance} valueB={resultB?.carAllowance ?? null} compareMode={compareMode} />
              )}
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
              {(resultA.studentLoanRepayment > 0 || (resultB?.studentLoanRepayment ?? 0) > 0) && (
                <CompareRow
                  label={`Student Loan (${(salary.studentLoanPlan && salary.studentLoanPlan !== 'none') ? getStudentLoanPlans(DEFAULT_TAX_YEAR)[salary.studentLoanPlan].label : ''})`}
                  valueA={resultA.studentLoanRepayment}
                  valueB={resultB?.studentLoanRepayment ?? null}
                  compareMode={compareMode}
                  isDeduction
                />
              )}
              {(resultA.postgradLoanRepayment > 0 || (resultB?.postgradLoanRepayment ?? 0) > 0) && (
                <CompareRow label="Postgraduate Loan" valueA={resultA.postgradLoanRepayment} valueB={resultB?.postgradLoanRepayment ?? null} compareMode={compareMode} isDeduction />
              )}
              {(resultA.bikTax > 0 || (resultB?.bikTax ?? 0) > 0) && (
                <CompareRow label="BIK Tax (included in Income Tax above)" valueA={resultA.bikTax} valueB={resultB?.bikTax ?? null} compareMode={compareMode} isDeduction />
              )}
              {(resultA.childBenefitReceived > 0 || (resultB?.childBenefitReceived ?? 0) > 0) && (
                <tr>
                  <td className="py-1.5 text-green-800">Child Benefit</td>
                  <td className="text-right text-green-800">+{formatCurrency(resultA.childBenefitReceived)}</td>
                  {compareMode && resultB && (
                    <>
                      <td className="text-right text-green-800">+{formatCurrency(resultB.childBenefitReceived)}</td>
                      <td></td>
                    </>
                  )}
                </tr>
              )}
              {(adjA.effectiveCharge > 0 || (adjB?.effectiveCharge ?? 0) > 0) && (
                <CompareRow label="Child Benefit Charge (HICBC)" valueA={adjA.effectiveCharge} valueB={adjB?.effectiveCharge ?? null} compareMode={compareMode} isDeduction />
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
              <MonthlyRow label="Monthly Salary (after pension & sacrifice)" valueA={resultA.grossAfterDeductions / 12} valueB={resultB ? resultB.grossAfterDeductions / 12 : null} compareMode={compareMode} />
              <MonthlyRow label="Monthly Income Tax" valueA={resultA.incomeTax / 12} valueB={resultB ? resultB.incomeTax / 12 : null} compareMode={compareMode} />
              <MonthlyRow label="Monthly NI" valueA={resultA.nationalInsurance / 12} valueB={resultB ? resultB.nationalInsurance / 12 : null} compareMode={compareMode} />
              {(resultA.studentLoanRepayment + resultA.postgradLoanRepayment > 0 || ((resultB?.studentLoanRepayment ?? 0) + (resultB?.postgradLoanRepayment ?? 0)) > 0) && (
                <MonthlyRow
                  label="Monthly Student Loan"
                  valueA={(resultA.studentLoanRepayment + resultA.postgradLoanRepayment) / 12}
                  valueB={resultB ? (resultB.studentLoanRepayment + resultB.postgradLoanRepayment) / 12 : null}
                  compareMode={compareMode}
                />
              )}

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
                <div className="text-[11px] text-gray-500">Tax {resultA.marginalTaxRate}% + NI {resultA.marginalNIRate}%{resultA.marginalStudentLoanRate > 0 ? ` + SL ${resultA.marginalStudentLoanRate}%` : ''}</div>
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
      <div className="text-[10px] text-gray-500">Tax {result.marginalTaxRate}% + NI {result.marginalNIRate}%{result.marginalStudentLoanRate > 0 ? ` + SL ${result.marginalStudentLoanRate}%` : ''}</div>
    </div>
  );
}
