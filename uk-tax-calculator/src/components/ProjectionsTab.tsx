// ProjectionsTab - Multi-year projection UI with per-year A/B scenario configuration

import { useState, useMemo, useEffect } from 'react';
import type {
  ProjectionInputs,
  YearConfig,
  YearScenarioConfig,
  YearCompanyCarConfig,
} from '../types/projection';
import type { TaxRegion } from '../data/taxRates2025';
import {
  calculateProjectionComparison,
  createDefaultYearConfigs,
  createDefaultYearScenarioConfig,
} from '../lib/calculator/projection';
import type { ScenarioDefaults } from '../lib/calculator/projection';
import { formatCurrency, safeNumber } from '../lib/utils/formatters';
import { constants } from '../data/constants';
import MonthPicker from './MonthPicker';

interface ProjectionsTabProps {
  baseSalary: number;
  taxRegion: TaxRegion;
  employeePensionPercentage: number;
  employerPensionPercentage: number;
  currentAge: number;
  retirementAge: number;
  hasChildren: boolean;
  numberOfChildren: number;
  bonusAmount: number;
  bonusSacrificePercentage: number;
  hasCompanyCar: boolean;
  carSalarySacrifice: number;
  carP11DValue: number;
  carBIKPercentage: number;
}

const inputCls = 'w-full px-2 py-1.5 border border-gray-300 rounded text-[13px] box-border focus:outline-none focus:ring-1 focus:ring-blue-500';
const inputClsB = `${inputCls} !border-blue-600`;
const labelCls = 'block mb-0.5 font-medium text-gray-700 text-xs';
const sectionCls = 'bg-gray-50 p-3 rounded-lg mb-3';

export function ProjectionsTab({
  baseSalary,
  taxRegion,
  employeePensionPercentage,
  employerPensionPercentage,
  currentAge,
  retirementAge,
  hasChildren,
  numberOfChildren,
  bonusAmount,
  bonusSacrificePercentage,
  hasCompanyCar,
  carSalarySacrifice,
  carP11DValue,
  carBIKPercentage,
}: ProjectionsTabProps) {
  const [projectionYears, setProjectionYears] = useState(constants.defaultProjectionYears);
  const [startingTaxYear, setStartingTaxYear] = useState(constants.defaultStartingTaxYear);
  const [defaultSalaryIncrease, setDefaultSalaryIncrease] = useState(constants.defaultSalaryIncrease);
  const [existingPensionPot, setExistingPensionPot] = useState(0);

  const [defaultPensionA] = useState(employeePensionPercentage);
  const [defaultPensionB] = useState(10);

  // Build defaults objects from Salary tab values
  const carDefaults = hasCompanyCar
    ? { hasCompanyCar, carSalarySacrifice, carP11DValue, carBIKPercentage }
    : undefined;
  const childrenCount = hasChildren ? numberOfChildren : 0;

  const buildDefaults = (pensionPct: number): ScenarioDefaults => ({
    employeePensionPercentage: pensionPct,
    numberOfChildrenForChildcare: childrenCount,
    bonusAmount,
    bonusSacrificePercentage,
    companyCar: carDefaults,
  });

  const [yearConfigs, setYearConfigs] = useState<YearConfig[]>(() =>
    createDefaultYearConfigs(
      projectionYears,
      buildDefaults(employeePensionPercentage),
      buildDefaults(10)
    )
  );

  const [expandedYear, setExpandedYear] = useState<number | null>(1);

  useEffect(() => {
    setYearConfigs(prev => {
      if (prev.length === projectionYears) return prev;
      if (prev.length < projectionYears) {
        const newYears = Array.from({ length: projectionYears - prev.length }, (_, i) => ({
          year: prev.length + i + 1,
          scenarioA: createDefaultYearScenarioConfig(buildDefaults(defaultPensionA)),
          scenarioB: createDefaultYearScenarioConfig(buildDefaults(defaultPensionB)),
        }));
        return [...prev, ...newYears];
      }
      return prev.slice(0, projectionYears);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectionYears, defaultPensionA, defaultPensionB, hasChildren, numberOfChildren, bonusAmount, bonusSacrificePercentage, hasCompanyCar, carSalarySacrifice, carP11DValue, carBIKPercentage]);

  const updateYearScenario = (year: number, scenario: 'A' | 'B', updates: Partial<YearScenarioConfig>) => {
    setYearConfigs(prev =>
      prev.map(yc => {
        if (yc.year !== year) return yc;
        const key = scenario === 'A' ? 'scenarioA' : 'scenarioB';
        return { ...yc, [key]: { ...yc[key], ...updates } };
      })
    );
  };

  const updateYearCar = (year: number, scenario: 'A' | 'B', updates: Partial<YearCompanyCarConfig>) => {
    setYearConfigs(prev =>
      prev.map(yc => {
        if (yc.year !== year) return yc;
        const key = scenario === 'A' ? 'scenarioA' : 'scenarioB';
        return { ...yc, [key]: { ...yc[key], companyCar: { ...yc[key].companyCar, ...updates } } };
      })
    );
  };

  const copyAtoB = (year: number) => {
    setYearConfigs(prev =>
      prev.map(yc => {
        if (yc.year !== year) return yc;
        return { ...yc, scenarioB: structuredClone(yc.scenarioA) };
      })
    );
  };

  const copyFromPreviousYear = (year: number, scenario: 'A' | 'B') => {
    if (year <= 1) return;
    setYearConfigs(prev => {
      const prevYear = prev.find(yc => yc.year === year - 1);
      if (!prevYear) return prev;
      const source = scenario === 'A' ? prevYear.scenarioA : prevYear.scenarioB;
      return prev.map(yc => {
        if (yc.year !== year) return yc;
        const key = scenario === 'A' ? 'scenarioA' : 'scenarioB';
        return { ...yc, [key]: structuredClone(source) };
      });
    });
  };

  // Fix: list individual dependencies instead of the whole props object
  const projectionInputs: ProjectionInputs = useMemo(() => ({
    taxRegion,
    projectionYears,
    startingTaxYear,
    baseSalary,
    defaultAnnualSalaryIncrease: defaultSalaryIncrease,
    defaultEmployeePensionPercentage: defaultPensionA,
    employerPensionPercentage,
    currentAge,
    retirementAge,
    existingPensionPot,
    yearConfigs,
  }), [
    taxRegion, projectionYears, startingTaxYear, baseSalary,
    defaultSalaryIncrease, defaultPensionA, employerPensionPercentage,
    currentAge, retirementAge, existingPensionPot, yearConfigs,
  ]);

  const comparison = useMemo(() => calculateProjectionComparison(projectionInputs), [projectionInputs]);
  const resultsA = comparison.scenarioA;
  const resultsB = comparison.scenarioB;

  const renderYearConfig = (yearConfig: YearConfig) => {
    const year = yearConfig.year;
    const taxYearLabel = `${startingTaxYear + year - 1}/${(startingTaxYear + year).toString().slice(-2)}`;
    const isExpanded = expandedYear === year;

    return (
      <div key={year} className="border border-gray-200 rounded-lg mb-2 overflow-hidden">
        <div
          onClick={() => setExpandedYear(isExpanded ? null : year)}
          className={`px-3 py-2.5 bg-white cursor-pointer flex justify-between items-center ${isExpanded ? 'border-b border-gray-200' : ''}`}
        >
          <span className="font-semibold text-sm">Year {year}: {taxYearLabel}</span>
          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-gray-500">
              A: {yearConfig.scenarioA.employeePensionPercentage}% | B: {yearConfig.scenarioB.employeePensionPercentage}%
            </span>
            <span className="text-gray-500">{isExpanded ? '\u25BC' : '\u25B6'}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="p-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[13px] font-semibold text-gray-700">Scenario A</span>
                  {year > 1 && (
                    <button onClick={() => copyFromPreviousYear(year, 'A')} className="text-[11px] px-2 py-0.5 bg-gray-200 border border-gray-300 rounded cursor-pointer hover:bg-gray-300">
                      Copy from Yr {year - 1}
                    </button>
                  )}
                </div>
                <ScenarioFields config={yearConfig.scenarioA} year={year} scenario="A" inputClass={inputCls} onUpdateScenario={updateYearScenario} onUpdateCar={updateYearCar} />
              </div>
              <div className="bg-blue-50 p-3 rounded-md border-l-[3px] border-blue-600">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[13px] font-semibold text-blue-600">Scenario B</span>
                  <div className="flex gap-1.5">
                    {year > 1 && (
                      <button onClick={() => copyFromPreviousYear(year, 'B')} className="text-[11px] px-2 py-0.5 bg-blue-100 border border-blue-300 rounded cursor-pointer hover:bg-blue-200">
                        Copy from Yr {year - 1}
                      </button>
                    )}
                    <button onClick={() => copyAtoB(year)} className="text-[11px] px-2 py-0.5 bg-blue-100 border border-blue-300 rounded cursor-pointer hover:bg-blue-200">
                      Copy from A
                    </button>
                  </div>
                </div>
                <ScenarioFields config={yearConfig.scenarioB} year={year} scenario="B" inputClass={inputClsB} onUpdateScenario={updateYearScenario} onUpdateCar={updateYearCar} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[450px_1fr] gap-6">
      {/* Input Form */}
      <div>
        <div className={sectionCls}>
          <h2 className="mb-3 text-base font-semibold">Projection Settings</h2>
          <div className="mb-3">
            <label className={labelCls}>Projection Period: {projectionYears} years</label>
            <input type="range" min={constants.minProjectionYears} max={constants.maxProjectionYears} value={projectionYears} onChange={e => setProjectionYears(Number(e.target.value))} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Starting Tax Year</label>
              <select value={startingTaxYear} onChange={e => setStartingTaxYear(Number(e.target.value))} className={inputCls}>
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                  <option key={y} value={y}>{y}/{(y + 1).toString().slice(-2)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Annual Salary Increase %</label>
              <input type="number" value={defaultSalaryIncrease} onChange={e => setDefaultSalaryIncrease(safeNumber(e.target.value))} className={inputCls} step="0.5" />
            </div>
          </div>
          <div className="mt-3">
            <label className={labelCls}>Existing Pension Pot</label>
            <input type="number" value={existingPensionPot} onChange={e => setExistingPensionPot(safeNumber(e.target.value))} className={inputCls} />
          </div>
          <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
            <div>Base Salary: {formatCurrency(baseSalary)}</div>
            <div>Employer Pension: {employerPensionPercentage}%</div>
            {bonusAmount > 0 && (
              <div>Bonus: {formatCurrency(bonusAmount)}{bonusSacrificePercentage > 0 ? ` (${bonusSacrificePercentage}% sacrificed)` : ''}</div>
            )}
            {hasCompanyCar && (
              <div>Company Car: {formatCurrency(carSalarySacrifice)}/mo, P11D {formatCurrency(carP11DValue)}, BIK {carBIKPercentage}%</div>
            )}
          </div>
        </div>

        <div className={sectionCls}>
          <h2 className="mb-3 text-base font-semibold">Year-by-Year Configuration</h2>
          <p className="text-xs text-gray-500 mb-3">Configure pension, company car, bonus, and childcare for each year and scenario</p>
          {yearConfigs.map(yc => renderYearConfig(yc))}
        </div>
      </div>

      {/* Results */}
      <div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-semibold text-gray-700 mb-3">Scenario A</div>
            <SummaryMetric label={`Total Take-Home (${projectionYears}yr)`} value={formatCurrency(resultsA.totalTakeHome)} color="text-emerald-600" size="text-2xl" />
            <SummaryMetric label="Total Tax Paid" value={formatCurrency(resultsA.totalTaxPaid)} color="text-red-600" size="text-lg" />
            <SummaryMetric label="Final Pension Pot" value={formatCurrency(resultsA.finalPensionPot)} color="text-violet-600" size="text-lg" />
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
            <div className="text-sm font-semibold text-blue-600 mb-3">Scenario B</div>
            <SummaryMetric label={`Total Take-Home (${projectionYears}yr)`} value={formatCurrency(resultsB.totalTakeHome)} color="text-emerald-600" size="text-2xl" diff={comparison.totalTakeHomeDifference} />
            <SummaryMetric label="Total Tax Paid" value={formatCurrency(resultsB.totalTaxPaid)} color="text-red-600" size="text-lg" />
            <SummaryMetric label="Final Pension Pot" value={formatCurrency(resultsB.finalPensionPot)} color="text-violet-600" size="text-lg" diff={comparison.finalPensionPotDifference} />
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg mb-6">
          <div className="font-semibold mb-1 text-sm">Summary</div>
          <p className="text-gray-700 text-sm m-0">{comparison.summary}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-base font-semibold m-0">Year-by-Year Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2.5 text-left font-semibold">Year</th>
                  <th className="p-2.5 text-right font-semibold">Salary</th>
                  <th className="p-2.5 text-right font-semibold" colSpan={2}>ANI</th>
                  <th className="p-2.5 text-right font-semibold" colSpan={2}>Marginal Rate</th>
                  <th className="p-2.5 text-right font-semibold" colSpan={2}>Monthly</th>
                  <th className="p-2.5 text-right font-semibold" colSpan={2}>Annual</th>
                  <th className="p-2.5 text-right font-semibold" colSpan={2}>Pension Pot</th>
                  <th className="p-2.5 text-right font-semibold" colSpan={2}>Cumulative</th>
                </tr>
                <tr className="bg-gray-100 text-[11px]">
                  <th className="px-2.5 py-1"></th><th className="px-2.5 py-1"></th>
                  <th className="px-2.5 py-1 text-right text-gray-500">A</th><th className="px-2.5 py-1 text-right text-blue-600">B</th>
                  <th className="px-2.5 py-1 text-right text-gray-500">A</th><th className="px-2.5 py-1 text-right text-blue-600">B</th>
                  <th className="px-2.5 py-1 text-right text-gray-500">A</th><th className="px-2.5 py-1 text-right text-blue-600">B</th>
                  <th className="px-2.5 py-1 text-right text-gray-500">A</th><th className="px-2.5 py-1 text-right text-blue-600">B</th>
                  <th className="px-2.5 py-1 text-right text-gray-500">A</th><th className="px-2.5 py-1 text-right text-blue-600">B</th>
                  <th className="px-2.5 py-1 text-right text-gray-500">A</th><th className="px-2.5 py-1 text-right text-blue-600">B</th>
                </tr>
              </thead>
              <tbody>
                {resultsA.yearResults.map((yearA, idx) => {
                  const yearB = resultsB.yearResults[idx];
                  const diff = comparison.yearDifferences[idx];
                  return (
                    <tr key={yearA.year} className="border-b border-gray-200">
                      <td className="p-2.5">
                        <div className="font-medium">{yearA.taxYear}</div>
                        <div className="text-[10px] text-gray-500">
                          {yearA.carBIKPercentage > 0 && `BIK: A=${yearA.carBIKPercentage}%`}
                          {yearB.carBIKPercentage > 0 && ` B=${yearB.carBIKPercentage}%`}
                        </div>
                      </td>
                      <td className="p-2.5 text-right">{formatCurrency(yearA.grossSalary)}</td>
                      <td className="p-2.5 text-right text-[11px]">{formatCurrency(yearA.adjustedNetIncome)}</td>
                      <td className="p-2.5 text-right text-[11px]">{formatCurrency(yearB.adjustedNetIncome)}</td>
                      <td className="p-2.5 text-right text-[11px]">{yearA.combinedMarginalRate}%</td>
                      <td className="p-2.5 text-right text-[11px]">{yearB.combinedMarginalRate}%</td>
                      <td className="p-2.5 text-right text-emerald-600 text-[11px]">{formatCurrency(yearA.monthlyTakeHome)}</td>
                      <td className="p-2.5 text-right text-emerald-600 text-[11px]">
                        {formatCurrency(yearB.monthlyTakeHome)}
                        <DiffBadge diff={diff.takeHomeDiff} divisor={12} />
                      </td>
                      <td className="p-2.5 text-right text-emerald-600">{formatCurrency(yearA.annualTakeHome)}</td>
                      <td className="p-2.5 text-right text-emerald-600">
                        {formatCurrency(yearB.annualTakeHome)}
                        <DiffBadge diff={diff.takeHomeDiff} />
                      </td>
                      <td className="p-2.5 text-right text-violet-600">{formatCurrency(yearA.yearEndPensionPot)}</td>
                      <td className="p-2.5 text-right text-violet-600">
                        {formatCurrency(yearB.yearEndPensionPot)}
                        <DiffBadge diff={diff.pensionPotDiff} />
                      </td>
                      <td className="p-2.5 text-right font-medium">{formatCurrency(yearA.cumulativeTakeHome)}</td>
                      <td className="p-2.5 text-right font-medium">{formatCurrency(yearB.cumulativeTakeHome)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="p-2.5">TOTAL</td>
                  <td className="p-2.5 text-right">-</td>
                  <td colSpan={2} className="p-2.5 text-center text-gray-500 text-[11px]">-</td>
                  <td colSpan={2} className="p-2.5 text-center text-gray-500 text-[11px]">-</td>
                  <td colSpan={2} className="p-2.5 text-center text-gray-500 text-[11px]">-</td>
                  <td className="p-2.5 text-right text-emerald-600">{formatCurrency(resultsA.totalTakeHome)}</td>
                  <td className="p-2.5 text-right text-emerald-600">{formatCurrency(resultsB.totalTakeHome)}</td>
                  <td className="p-2.5 text-right text-violet-600">{formatCurrency(resultsA.finalPensionPot)}</td>
                  <td className="p-2.5 text-right text-violet-600">{formatCurrency(resultsB.finalPensionPot)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function ScenarioFields({ config, year, scenario, inputClass, onUpdateScenario, onUpdateCar }: {
  config: YearScenarioConfig;
  year: number;
  scenario: 'A' | 'B';
  inputClass: string;
  onUpdateScenario: (year: number, scenario: 'A' | 'B', updates: Partial<YearScenarioConfig>) => void;
  onUpdateCar: (year: number, scenario: 'A' | 'B', updates: Partial<YearCompanyCarConfig>) => void;
}) {
  return (
    <>
      <div className="mb-2.5">
        <label className={labelCls}>Pension Sacrifice %</label>
        <input type="number" value={config.employeePensionPercentage} onChange={e => onUpdateScenario(year, scenario, { employeePensionPercentage: safeNumber(e.target.value) })} className={inputClass} min="0" max="100" />
      </div>

      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2.5 cursor-pointer">
        <input type="checkbox" checked={config.companyCar.hasCompanyCar} onChange={e => onUpdateCar(year, scenario, { hasCompanyCar: e.target.checked })} />
        Company Car
      </label>

      {config.companyCar.hasCompanyCar && (
        <div className={`p-2 rounded mb-2.5 ${scenario === 'A' ? 'bg-gray-100' : 'bg-blue-100'}`}>
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <div>
              <label className={labelCls}>BIK Rate %</label>
              <input type="number" value={config.companyCar.carBIKPercentage} onChange={e => onUpdateCar(year, scenario, { carBIKPercentage: safeNumber(e.target.value, 2) })} className={inputClass} min="0" max="37" />
            </div>
            <div>
              <label className={labelCls}>P11D Value</label>
              <input type="number" value={config.companyCar.carP11DValue} onChange={e => onUpdateCar(year, scenario, { carP11DValue: safeNumber(e.target.value) })} className={inputClass} />
            </div>
          </div>
          <div className="mb-1.5">
            <label className={labelCls}>Monthly Sacrifice</label>
            <input type="number" value={config.companyCar.carSalarySacrifice} onChange={e => onUpdateCar(year, scenario, { carSalarySacrifice: safeNumber(e.target.value) })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <MonthPicker label="Start Month" value={config.companyCar.startMonth} onChange={v => onUpdateCar(year, scenario, { startMonth: v })} />
            <MonthPicker label="End Month" value={config.companyCar.endMonth} onChange={v => onUpdateCar(year, scenario, { endMonth: v })} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 mb-2.5">
        <div>
          <label className={labelCls}>Bonus</label>
          <input type="number" value={config.bonusAmount} onChange={e => onUpdateScenario(year, scenario, { bonusAmount: safeNumber(e.target.value) })} className={inputClass} />
        </div>
        <div>
          <label className={labelCls}>Sacrifice %</label>
          <input type="number" value={config.bonusSacrificePercentage} onChange={e => onUpdateScenario(year, scenario, { bonusSacrificePercentage: safeNumber(e.target.value) })} className={inputClass} min="0" max="100" />
        </div>
      </div>

      <div>
        <label className={labelCls}>Children for Tax-Free Childcare</label>
        <input type="number" value={config.numberOfChildrenForChildcare} onChange={e => onUpdateScenario(year, scenario, { numberOfChildrenForChildcare: safeNumber(e.target.value) })} className={inputClass} min="0" max="10" />
      </div>
    </>
  );
}

function SummaryMetric({ label, value, color, size, diff }: { label: string; value: string; color: string; size: string; diff?: number }) {
  return (
    <div className="mb-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`${size} font-bold ${color}`}>
        {value}
        {diff !== undefined && (
          <span className={`text-xs ml-2 ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ({diff >= 0 ? '+' : ''}{formatCurrency(diff)})
          </span>
        )}
      </div>
    </div>
  );
}

function DiffBadge({ diff, divisor = 1 }: { diff: number; divisor?: number }) {
  if (diff === 0) return null;
  const display = divisor !== 1 ? Math.round(diff / divisor) : diff;
  return (
    <div className={`text-[10px] ${diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
      {diff > 0 ? '+' : ''}{formatCurrency(display)}
    </div>
  );
}

export default ProjectionsTab;
