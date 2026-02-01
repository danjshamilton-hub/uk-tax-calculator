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
import { formatCurrency } from '../lib/utils/formatters';
import { constants } from '../data/constants';
import MonthPicker from './MonthPicker';

interface ProjectionsTabProps {
  // Inherit base values from salary tab
  baseSalary: number;
  taxRegion: TaxRegion;
  employeePensionPercentage: number;
  employerPensionPercentage: number;
  currentAge: number;
  retirementAge: number;
  hasChildren: boolean;
  numberOfChildren: number;
}

// Helper to safely parse numeric input
function safeNumber(value: string | number, fallback: number = 0): number {
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? fallback : parsed;
}

export function ProjectionsTab(props: ProjectionsTabProps) {
  // Projection settings
  const [projectionYears, setProjectionYears] = useState(constants.defaultProjectionYears);
  const [startingTaxYear, setStartingTaxYear] = useState(constants.defaultStartingTaxYear);
  const [defaultSalaryIncrease, setDefaultSalaryIncrease] = useState(constants.defaultSalaryIncrease);
  const [existingPensionPot, setExistingPensionPot] = useState(0);

  // Default pension percentages for A and B
  const [defaultPensionA] = useState(props.employeePensionPercentage);
  const [defaultPensionB] = useState(10);

  // Year configurations
  const [yearConfigs, setYearConfigs] = useState<YearConfig[]>(() =>
    createDefaultYearConfigs(
      projectionYears,
      props.employeePensionPercentage,
      10,
      props.hasChildren ? props.numberOfChildren : 0
    )
  );

  // Expanded year for editing
  const [expandedYear, setExpandedYear] = useState<number | null>(1);

  // Update year configs when projection years changes
  useEffect(() => {
    setYearConfigs((prev) => {
      if (prev.length === projectionYears) return prev;

      if (prev.length < projectionYears) {
        // Add new years
        const newYears = Array.from({ length: projectionYears - prev.length }, (_, i) => ({
          year: prev.length + i + 1,
          scenarioA: createDefaultYearScenarioConfig(
            defaultPensionA,
            props.hasChildren ? props.numberOfChildren : 0
          ),
          scenarioB: createDefaultYearScenarioConfig(
            defaultPensionB,
            props.hasChildren ? props.numberOfChildren : 0
          ),
        }));
        return [...prev, ...newYears];
      } else {
        // Remove excess years
        return prev.slice(0, projectionYears);
      }
    });
  }, [projectionYears, defaultPensionA, defaultPensionB, props.hasChildren, props.numberOfChildren]);

  // Styles
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    fontSize: '13px',
    boxSizing: 'border-box' as const,
  };

  const inputStyleB: React.CSSProperties = {
    ...inputStyle,
    borderColor: '#2563EB',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '2px',
    fontWeight: 500,
    color: '#374151',
    fontSize: '12px',
  };

  const sectionStyle: React.CSSProperties = {
    background: '#F9FAFB',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '12px',
  };

  // Update a specific year's scenario config
  const updateYearScenario = (
    year: number,
    scenario: 'A' | 'B',
    updates: Partial<YearScenarioConfig>
  ) => {
    setYearConfigs((prev) =>
      prev.map((yc) => {
        if (yc.year !== year) return yc;
        const key = scenario === 'A' ? 'scenarioA' : 'scenarioB';
        return {
          ...yc,
          [key]: { ...yc[key], ...updates },
        };
      })
    );
  };

  // Update a specific year's car config
  const updateYearCar = (
    year: number,
    scenario: 'A' | 'B',
    updates: Partial<YearCompanyCarConfig>
  ) => {
    setYearConfigs((prev) =>
      prev.map((yc) => {
        if (yc.year !== year) return yc;
        const key = scenario === 'A' ? 'scenarioA' : 'scenarioB';
        return {
          ...yc,
          [key]: {
            ...yc[key],
            companyCar: { ...yc[key].companyCar, ...updates },
          },
        };
      })
    );
  };

  // Copy year A config to year B
  const copyAtoB = (year: number) => {
    setYearConfigs((prev) =>
      prev.map((yc) => {
        if (yc.year !== year) return yc;
        return {
          ...yc,
          scenarioB: JSON.parse(JSON.stringify(yc.scenarioA)),
        };
      })
    );
  };

  // Build projection inputs
  const projectionInputs: ProjectionInputs = useMemo(
    () => ({
      taxRegion: props.taxRegion,
      projectionYears,
      startingTaxYear,
      baseSalary: props.baseSalary,
      defaultAnnualSalaryIncrease: defaultSalaryIncrease,
      defaultEmployeePensionPercentage: defaultPensionA,
      employerPensionPercentage: props.employerPensionPercentage,
      currentAge: props.currentAge,
      retirementAge: props.retirementAge,
      existingPensionPot,
      yearConfigs,
    }),
    [
      props,
      projectionYears,
      startingTaxYear,
      defaultSalaryIncrease,
      defaultPensionA,
      existingPensionPot,
      yearConfigs,
    ]
  );

  // Calculate projections
  const comparison = useMemo(
    () => calculateProjectionComparison(projectionInputs),
    [projectionInputs]
  );

  const resultsA = comparison.scenarioA;
  const resultsB = comparison.scenarioB;

  // Render year configuration panel
  const renderYearConfig = (yearConfig: YearConfig) => {
    const year = yearConfig.year;
    const taxYearLabel = `${startingTaxYear + year - 1}/${(startingTaxYear + year).toString().slice(-2)}`;
    const isExpanded = expandedYear === year;

    return (
      <div
        key={year}
        style={{
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          marginBottom: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Year header */}
        <div
          onClick={() => setExpandedYear(isExpanded ? null : year)}
          style={{
            padding: '10px 12px',
            background: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: isExpanded ? '1px solid #E5E7EB' : 'none',
          }}
        >
          <span style={{ fontWeight: 600 }}>Year {year}: {taxYearLabel}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#6B7280' }}>
              A: {yearConfig.scenarioA.employeePensionPercentage}% |
              B: {yearConfig.scenarioB.employeePensionPercentage}%
            </span>
            <span style={{ color: '#6B7280' }}>{isExpanded ? '▼' : '▶'}</span>
          </div>
        </div>

        {/* Expanded configuration */}
        {isExpanded && (
          <div style={{ padding: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Scenario A */}
              <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
                  Scenario A
                </div>

                {/* Pension */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>Pension Sacrifice %</label>
                  <input
                    type="number"
                    value={yearConfig.scenarioA.employeePensionPercentage}
                    onChange={(e) =>
                      updateYearScenario(year, 'A', {
                        employeePensionPercentage: safeNumber(e.target.value, 0),
                      })
                    }
                    style={inputStyle}
                    min="0"
                    max="100"
                  />
                </div>

                {/* Company Car */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={yearConfig.scenarioA.companyCar.hasCompanyCar}
                      onChange={(e) =>
                        updateYearCar(year, 'A', { hasCompanyCar: e.target.checked })
                      }
                    />
                    Company Car
                  </label>
                </div>

                {yearConfig.scenarioA.companyCar.hasCompanyCar && (
                  <div style={{ background: '#F3F4F6', padding: '8px', borderRadius: '4px', marginBottom: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                      <div>
                        <label style={labelStyle}>BIK Rate %</label>
                        <input
                          type="number"
                          value={yearConfig.scenarioA.companyCar.carBIKPercentage}
                          onChange={(e) =>
                            updateYearCar(year, 'A', { carBIKPercentage: safeNumber(e.target.value, 2) })
                          }
                          style={inputStyle}
                          min="0"
                          max="37"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>P11D Value</label>
                        <input
                          type="number"
                          value={yearConfig.scenarioA.companyCar.carP11DValue}
                          onChange={(e) =>
                            updateYearCar(year, 'A', { carP11DValue: safeNumber(e.target.value, 0) })
                          }
                          style={inputStyle}
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: '6px' }}>
                      <label style={labelStyle}>Monthly Sacrifice £</label>
                      <input
                        type="number"
                        value={yearConfig.scenarioA.companyCar.carSalarySacrifice}
                        onChange={(e) =>
                          updateYearCar(year, 'A', { carSalarySacrifice: safeNumber(e.target.value, 0) })
                        }
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <MonthPicker
                        label="Start Month"
                        value={yearConfig.scenarioA.companyCar.startMonth}
                        onChange={(v) => updateYearCar(year, 'A', { startMonth: v })}
                      />
                      <MonthPicker
                        label="End Month"
                        value={yearConfig.scenarioA.companyCar.endMonth}
                        onChange={(v) => updateYearCar(year, 'A', { endMonth: v })}
                      />
                    </div>
                  </div>
                )}

                {/* Bonus */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                  <div>
                    <label style={labelStyle}>Bonus £</label>
                    <input
                      type="number"
                      value={yearConfig.scenarioA.bonusAmount}
                      onChange={(e) =>
                        updateYearScenario(year, 'A', { bonusAmount: safeNumber(e.target.value, 0) })
                      }
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Sacrifice %</label>
                    <input
                      type="number"
                      value={yearConfig.scenarioA.bonusSacrificePercentage}
                      onChange={(e) =>
                        updateYearScenario(year, 'A', {
                          bonusSacrificePercentage: safeNumber(e.target.value, 0),
                        })
                      }
                      style={inputStyle}
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                {/* Children for Childcare */}
                <div>
                  <label style={labelStyle}>Children for Tax-Free Childcare</label>
                  <input
                    type="number"
                    value={yearConfig.scenarioA.numberOfChildrenForChildcare}
                    onChange={(e) =>
                      updateYearScenario(year, 'A', {
                        numberOfChildrenForChildcare: safeNumber(e.target.value, 0),
                      })
                    }
                    style={inputStyle}
                    min="0"
                    max="10"
                  />
                </div>
              </div>

              {/* Scenario B */}
              <div style={{ background: '#EFF6FF', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #2563EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB' }}>Scenario B</span>
                  <button
                    onClick={() => copyAtoB(year)}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      background: '#DBEAFE',
                      border: '1px solid #93C5FD',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Copy from A
                  </button>
                </div>

                {/* Pension */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>Pension Sacrifice %</label>
                  <input
                    type="number"
                    value={yearConfig.scenarioB.employeePensionPercentage}
                    onChange={(e) =>
                      updateYearScenario(year, 'B', {
                        employeePensionPercentage: safeNumber(e.target.value, 0),
                      })
                    }
                    style={inputStyleB}
                    min="0"
                    max="100"
                  />
                </div>

                {/* Company Car */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={yearConfig.scenarioB.companyCar.hasCompanyCar}
                      onChange={(e) =>
                        updateYearCar(year, 'B', { hasCompanyCar: e.target.checked })
                      }
                    />
                    Company Car
                  </label>
                </div>

                {yearConfig.scenarioB.companyCar.hasCompanyCar && (
                  <div style={{ background: '#DBEAFE', padding: '8px', borderRadius: '4px', marginBottom: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                      <div>
                        <label style={labelStyle}>BIK Rate %</label>
                        <input
                          type="number"
                          value={yearConfig.scenarioB.companyCar.carBIKPercentage}
                          onChange={(e) =>
                            updateYearCar(year, 'B', { carBIKPercentage: safeNumber(e.target.value, 2) })
                          }
                          style={inputStyleB}
                          min="0"
                          max="37"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>P11D Value</label>
                        <input
                          type="number"
                          value={yearConfig.scenarioB.companyCar.carP11DValue}
                          onChange={(e) =>
                            updateYearCar(year, 'B', { carP11DValue: safeNumber(e.target.value, 0) })
                          }
                          style={inputStyleB}
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: '6px' }}>
                      <label style={labelStyle}>Monthly Sacrifice £</label>
                      <input
                        type="number"
                        value={yearConfig.scenarioB.companyCar.carSalarySacrifice}
                        onChange={(e) =>
                          updateYearCar(year, 'B', { carSalarySacrifice: safeNumber(e.target.value, 0) })
                        }
                        style={inputStyleB}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <MonthPicker
                        label="Start Month"
                        value={yearConfig.scenarioB.companyCar.startMonth}
                        onChange={(v) => updateYearCar(year, 'B', { startMonth: v })}
                      />
                      <MonthPicker
                        label="End Month"
                        value={yearConfig.scenarioB.companyCar.endMonth}
                        onChange={(v) => updateYearCar(year, 'B', { endMonth: v })}
                      />
                    </div>
                  </div>
                )}

                {/* Bonus */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                  <div>
                    <label style={labelStyle}>Bonus £</label>
                    <input
                      type="number"
                      value={yearConfig.scenarioB.bonusAmount}
                      onChange={(e) =>
                        updateYearScenario(year, 'B', { bonusAmount: safeNumber(e.target.value, 0) })
                      }
                      style={inputStyleB}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Sacrifice %</label>
                    <input
                      type="number"
                      value={yearConfig.scenarioB.bonusSacrificePercentage}
                      onChange={(e) =>
                        updateYearScenario(year, 'B', {
                          bonusSacrificePercentage: safeNumber(e.target.value, 0),
                        })
                      }
                      style={inputStyleB}
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                {/* Children for Childcare */}
                <div>
                  <label style={labelStyle}>Children for Tax-Free Childcare</label>
                  <input
                    type="number"
                    value={yearConfig.scenarioB.numberOfChildrenForChildcare}
                    onChange={(e) =>
                      updateYearScenario(year, 'B', {
                        numberOfChildrenForChildcare: safeNumber(e.target.value, 0),
                      })
                    }
                    style={inputStyleB}
                    min="0"
                    max="10"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '450px 1fr', gap: '24px' }}>
      {/* Input Form */}
      <div>
        {/* Global Settings */}
        <div style={sectionStyle}>
          <h2 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
            📈 Projection Settings
          </h2>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Projection Period: {projectionYears} years</label>
            <input
              type="range"
              min={constants.minProjectionYears}
              max={constants.maxProjectionYears}
              value={projectionYears}
              onChange={(e) => setProjectionYears(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Starting Tax Year</label>
              <select
                value={startingTaxYear}
                onChange={(e) => setStartingTaxYear(Number(e.target.value))}
                style={inputStyle}
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((year) => (
                  <option key={year} value={year}>
                    {year}/{(year + 1).toString().slice(-2)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Annual Salary Increase %</label>
              <input
                type="number"
                value={defaultSalaryIncrease}
                onChange={(e) => setDefaultSalaryIncrease(safeNumber(e.target.value, 0))}
                style={inputStyle}
                step="0.5"
              />
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={labelStyle}>Existing Pension Pot £</label>
            <input
              type="number"
              value={existingPensionPot}
              onChange={(e) => setExistingPensionPot(safeNumber(e.target.value, 0))}
              style={inputStyle}
            />
          </div>

          <div style={{ marginTop: '12px', padding: '8px', background: '#EFF6FF', borderRadius: '4px', fontSize: '12px' }}>
            <div>Base Salary: {formatCurrency(props.baseSalary)}</div>
            <div>Employer Pension: {props.employerPensionPercentage}%</div>
          </div>
        </div>

        {/* Year-by-Year Configuration */}
        <div style={sectionStyle}>
          <h2 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
            📅 Year-by-Year Configuration
          </h2>
          <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
            Configure pension, company car, bonus, and childcare for each year and scenario
          </p>

          {yearConfigs.map((yc) => renderYearConfig(yc))}
        </div>
      </div>

      {/* Results */}
      <div>
        {/* Summary Comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {/* Scenario A Summary */}
          <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
              Scenario A
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Total Take-Home ({projectionYears}yr)</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                {formatCurrency(resultsA.totalTakeHome)}
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Total Tax Paid</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#DC2626' }}>
                {formatCurrency(resultsA.totalTaxPaid)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Final Pension Pot</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7C3AED' }}>
                {formatCurrency(resultsA.finalPensionPot)}
              </div>
            </div>
          </div>

          {/* Scenario B Summary */}
          <div style={{ background: '#EFF6FF', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #2563EB' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#2563EB', marginBottom: '12px' }}>
              Scenario B
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Total Take-Home ({projectionYears}yr)</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                {formatCurrency(resultsB.totalTakeHome)}
                <span
                  style={{
                    fontSize: '12px',
                    marginLeft: '8px',
                    color: comparison.totalTakeHomeDifference >= 0 ? '#059669' : '#DC2626',
                  }}
                >
                  ({comparison.totalTakeHomeDifference >= 0 ? '+' : ''}
                  {formatCurrency(comparison.totalTakeHomeDifference)})
                </span>
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Total Tax Paid</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#DC2626' }}>
                {formatCurrency(resultsB.totalTaxPaid)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Final Pension Pot</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7C3AED' }}>
                {formatCurrency(resultsB.finalPensionPot)}
                <span
                  style={{
                    fontSize: '12px',
                    marginLeft: '8px',
                    color: comparison.finalPensionPotDifference >= 0 ? '#059669' : '#DC2626',
                  }}
                >
                  ({comparison.finalPensionPotDifference >= 0 ? '+' : ''}
                  {formatCurrency(comparison.finalPensionPotDifference)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Summary */}
        <div style={{ background: '#F9FAFB', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Summary</div>
          <p style={{ color: '#374151', margin: 0 }}>{comparison.summary}</p>
        </div>

        {/* Year-by-Year Results Table */}
        <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Year-by-Year Breakdown</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>Year</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>Salary</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }} colSpan={2}>ANI</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }} colSpan={2}>Marginal Rate</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }} colSpan={2}>Monthly</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }} colSpan={2}>Annual</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }} colSpan={2}>Pension Pot</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }} colSpan={2}>Cumulative</th>
                </tr>
                <tr style={{ background: '#F3F4F6', fontSize: '11px' }}>
                  <th style={{ padding: '4px 10px' }}></th>
                  <th style={{ padding: '4px 10px' }}></th>
                  <th style={{ padding: '4px 10px', textAlign: 'right', color: '#6B7280' }}>A</th>
                  <th style={{ padding: '4px 10px', textAlign: 'right', color: '#2563EB' }}>B</th>
                  <th style={{ padding: '4px 10px', textAlign: 'right', color: '#6B7280' }}>A</th>
                  <th style={{ padding: '4px 10px', textAlign: 'right', color: '#2563EB' }}>B</th>
                  <th style={{ padding: '4px 10px', textAlign: 'right', color: '#6B7280' }}>A</th>
                  <th style={{ padding: '4px 10px', textAlign: 'right', color: '#2563EB' }}>B</th>
                  <th style={{ padding: '4px 10px', textAlign: 'right', color: '#6B7280' }}>A</th>
                  <th style={{ padding: '4px 10px', textAlign: 'right', color: '#2563EB' }}>B</th>
                  <th style={{ padding: '4px 10px', textAlign: 'right', color: '#6B7280' }}>A</th>
                  <th style={{ padding: '4px 10px', textAlign: 'right', color: '#2563EB' }}>B</th>
                  <th style={{ padding: '4px 10px', textAlign: 'right', color: '#6B7280' }}>A</th>
                  <th style={{ padding: '4px 10px', textAlign: 'right', color: '#2563EB' }}>B</th>
                </tr>
              </thead>
              <tbody>
                {resultsA.yearResults.map((yearA, idx) => {
                  const yearB = resultsB.yearResults[idx];
                  const diff = comparison.yearDifferences[idx];
                  return (
                    <tr key={yearA.year} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 500 }}>{yearA.taxYear}</div>
                        <div style={{ fontSize: '10px', color: '#6B7280' }}>
                          {yearA.carBIKPercentage > 0 && `BIK: A=${yearA.carBIKPercentage}%`}
                          {yearB.carBIKPercentage > 0 && ` B=${yearB.carBIKPercentage}%`}
                        </div>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        {formatCurrency(yearA.grossSalary)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontSize: '11px' }}>
                        {formatCurrency(yearA.adjustedNetIncome)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontSize: '11px' }}>
                        {formatCurrency(yearB.adjustedNetIncome)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontSize: '11px' }}>
                        {yearA.combinedMarginalRate}%
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontSize: '11px' }}>
                        {yearB.combinedMarginalRate}%
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#059669', fontSize: '11px' }}>
                        {formatCurrency(yearA.monthlyTakeHome)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#059669', fontSize: '11px' }}>
                        {formatCurrency(yearB.monthlyTakeHome)}
                        {diff.takeHomeDiff !== 0 && (
                          <div style={{ fontSize: '10px', color: diff.takeHomeDiff > 0 ? '#059669' : '#DC2626' }}>
                            {diff.takeHomeDiff > 0 ? '+' : ''}{formatCurrency(Math.round(diff.takeHomeDiff / 12))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>
                        {formatCurrency(yearA.annualTakeHome)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>
                        {formatCurrency(yearB.annualTakeHome)}
                        {diff.takeHomeDiff !== 0 && (
                          <div style={{ fontSize: '10px', color: diff.takeHomeDiff > 0 ? '#059669' : '#DC2626' }}>
                            {diff.takeHomeDiff > 0 ? '+' : ''}{formatCurrency(diff.takeHomeDiff)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#7C3AED' }}>
                        {formatCurrency(yearA.yearEndPensionPot)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#7C3AED' }}>
                        {formatCurrency(yearB.yearEndPensionPot)}
                        {diff.pensionPotDiff !== 0 && (
                          <div style={{ fontSize: '10px', color: diff.pensionPotDiff > 0 ? '#059669' : '#DC2626' }}>
                            {diff.pensionPotDiff > 0 ? '+' : ''}{formatCurrency(diff.pensionPotDiff)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(yearA.cumulativeTakeHome)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(yearB.cumulativeTakeHome)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F9FAFB', fontWeight: 600 }}>
                  <td style={{ padding: '10px' }}>TOTAL</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>-</td>
                  <td colSpan={2} style={{ padding: '10px', textAlign: 'center', color: '#6B7280', fontSize: '11px' }}>-</td>
                  <td colSpan={2} style={{ padding: '10px', textAlign: 'center', color: '#6B7280', fontSize: '11px' }}>-</td>
                  <td colSpan={2} style={{ padding: '10px', textAlign: 'center', color: '#6B7280', fontSize: '11px' }}>-</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>
                    {formatCurrency(resultsA.totalTakeHome)}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>
                    {formatCurrency(resultsB.totalTakeHome)}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#7C3AED' }}>
                    {formatCurrency(resultsA.finalPensionPot)}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', color: '#7C3AED' }}>
                    {formatCurrency(resultsB.finalPensionPot)}
                  </td>
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

export default ProjectionsTab;
