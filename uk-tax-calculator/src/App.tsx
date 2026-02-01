import { useState } from 'react';
import { calculateAllResults, getTaxBreakdown } from './lib/calculator';
import type { ScenarioInputs, HousePurchaseInputs, CalculationResults } from './types/scenario';
import type { TaxRegion } from './data/taxRates2025';
import { formatCurrency } from './lib/utils/formatters';
import { constants } from './data/constants';
import { ProjectionsTab } from './components/ProjectionsTab';

// Helper to safely parse numeric input and prevent NaN
function safeNumber(value: string | number, fallback: number = 0): number {
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? fallback : parsed;
}

function App() {
  // Tab navigation
  const [activeTab, setActiveTab] = useState<'salary' | 'house' | 'projections'>('salary');

  // Comparison mode
  const [compareMode, setCompareMode] = useState(false);

  // Tax breakdown expansion
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  // Basic inputs (Scenario A)
  const [grossSalary, setGrossSalary] = useState(50000);
  const [taxRegion, setTaxRegion] = useState<TaxRegion>('scotland');
  const [employeePensionPercentage, setEmployeePensionPercentage] = useState(5);
  const [employerPensionPercentage, setEmployerPensionPercentage] = useState(3);
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(65);

  // Scenario B overrides (for comparison)
  const [employeePensionPercentageB, setEmployeePensionPercentageB] = useState(10);
  const [grossSalaryB, setGrossSalaryB] = useState(50000);

  // Company car inputs (Scenario A)
  const [hasCompanyCar, setHasCompanyCar] = useState(false);
  const [carSalarySacrifice, setCarSalarySacrifice] = useState(500);
  const [carP11DValue, setCarP11DValue] = useState(35000);
  const [carBIKPercentage, setCarBIKPercentage] = useState(2);

  // Company car inputs (Scenario B)
  const [hasCompanyCarB, setHasCompanyCarB] = useState(false);
  const [carSalarySacrificeB, setCarSalarySacrificeB] = useState(500);
  const [carP11DValueB, setCarP11DValueB] = useState(35000);
  const [carBIKPercentageB, setCarBIKPercentageB] = useState(2);

  // Children inputs
  const [hasChildren, setHasChildren] = useState(false);
  const [numberOfChildren, setNumberOfChildren] = useState(2);
  const [claimsChildBenefitA, setClaimsChildBenefitA] = useState(true);
  const [claimsChildBenefitB, setClaimsChildBenefitB] = useState(true);
  const [usesTaxFreeChildcareA, setUsesTaxFreeChildcareA] = useState(true);
  const [usesTaxFreeChildcareB, setUsesTaxFreeChildcareB] = useState(true);

  // Bonus inputs (Scenario A)
  const [bonusAmount, setBonusAmount] = useState(0);
  const [bonusSacrificePercentage, setBonusSacrificePercentage] = useState(0);

  // Bonus inputs (Scenario B)
  const [bonusAmountB, setBonusAmountB] = useState(0);
  const [bonusSacrificePercentageB, setBonusSacrificePercentageB] = useState(0);

  // House purchase inputs
  const [houseValuation, setHouseValuation] = useState(300000);
  const [purchasePrice, setPurchasePrice] = useState(300000);
  const [depositPercentage, setDepositPercentage] = useState(10);
  const [partnerGrossSalary, setPartnerGrossSalary] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(50000);
  const [currentHouseSalePrice, setCurrentHouseSalePrice] = useState(0);
  const [currentHouseMortgage, setCurrentHouseMortgage] = useState(0);
  const [movingCosts, setMovingCosts] = useState(5000);
  const [mortgageInterestRate, setMortgageInterestRate] = useState(4.5);
  const [mortgageTerm, setMortgageTerm] = useState(25);

  // Build house purchase inputs (always enabled for house tab)
  const housePurchaseInputs: HousePurchaseInputs = {
    houseValuation,
    purchasePrice,
    depositPercentage,
    partnerGrossSalary,
    currentBalance,
    currentHouseSalePrice,
    currentHouseMortgage,
    movingCosts,
    mortgageInterestRate,
    mortgageTerm,
  };

  // Build Scenario A inputs
  const inputsA: ScenarioInputs = {
    name: 'Scenario A',
    taxRegion,
    grossSalary,
    employeePensionPercentage,
    employerPensionPercentage,
    bonusAmount,
    bonusSacrificePercentage,
    hasCompanyCar,
    carSalarySacrifice: hasCompanyCar ? carSalarySacrifice * 12 : 0,
    carP11DValue,
    carBIKPercentage,
    currentAge,
    retirementAge,
    hasChildren,
    numberOfChildren: hasChildren ? numberOfChildren : 0,
    housePurchase: housePurchaseInputs,
  };

  // Build Scenario B inputs (for comparison)
  const inputsB: ScenarioInputs = {
    ...inputsA,
    name: 'Scenario B',
    grossSalary: grossSalaryB,
    employeePensionPercentage: employeePensionPercentageB,
    bonusAmount: bonusAmountB,
    bonusSacrificePercentage: bonusSacrificePercentageB,
    hasCompanyCar: hasCompanyCarB,
    carSalarySacrifice: hasCompanyCarB ? carSalarySacrificeB * 12 : 0,
    carP11DValue: carP11DValueB,
    carBIKPercentage: carBIKPercentageB,
  };

  const resultA = calculateAllResults(inputsA);
  const resultB = compareMode ? calculateAllResults(inputsB) : null;

  // Adjust take-home calculations
  const getAdjustedValues = (result: CalculationResults, claimsChildBenefit: boolean, usesTaxFreeChildcare: boolean) => {
    const effectiveCharge = claimsChildBenefit ? result.childBenefitCharge : 0;
    const adjustedAnnual = claimsChildBenefit
      ? result.annualTakeHome
      : result.annualTakeHome + result.childBenefitCharge;
    const adjustedMonthly = adjustedAnnual / 12;
    // Tax-Free Childcare is now a benefit - add it if eligible and using the scheme
    const taxFreeChildcareBenefitAmount = usesTaxFreeChildcare ? result.taxFreeChildcareBenefit : 0;
    const effectiveMonthly = adjustedMonthly + (taxFreeChildcareBenefitAmount / 12);
    const hasTaxFreeChildcareBenefit = usesTaxFreeChildcare && result.taxFreeChildcareBenefit > 0;
    return { effectiveCharge, adjustedAnnual, adjustedMonthly, effectiveMonthly, hasTaxFreeChildcareBenefit, taxFreeChildcareBenefitAmount };
  };

  const adjA = getAdjustedValues(resultA, claimsChildBenefitA, usesTaxFreeChildcareA);
  const adjB = resultB ? getAdjustedValues(resultB, claimsChildBenefitB, usesTaxFreeChildcareB) : null;

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '4px',
    fontWeight: '500' as const,
    color: '#374151',
    fontSize: '14px',
  };

  const fieldStyle = {
    marginBottom: '12px',
  };

  const sectionStyle = {
    background: '#F9FAFB',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
  };

  const sectionHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontSize: '16px',
    fontWeight: '600' as const,
  };

  // Comparison table row component
  const CompareRow = ({ label, valueA, valueB, isDeduction = false, isBold = false }: {
    label: string;
    valueA: number;
    valueB: number | null;
    isDeduction?: boolean;
    isBold?: boolean;
  }) => {
    const diff = valueB !== null ? valueB - valueA : null;
    const color = isDeduction ? '#DC2626' : undefined;
    const diffColor = diff !== null ? (diff > 0 ? '#059669' : diff < 0 ? '#DC2626' : '#6B7280') : undefined;

    return (
      <tr style={{ fontWeight: isBold ? 'bold' : undefined }}>
        <td style={{ padding: '6px 0' }}>{label}</td>
        <td style={{ textAlign: 'right', color }}>{isDeduction ? '-' : ''}{formatCurrency(Math.abs(valueA))}</td>
        {compareMode && valueB !== null && (
          <>
            <td style={{ textAlign: 'right', color }}>{isDeduction ? '-' : ''}{formatCurrency(Math.abs(valueB))}</td>
            <td style={{ textAlign: 'right', color: diffColor, fontSize: '13px' }}>
              {diff !== null && diff !== 0 && (
                <>{diff > 0 ? '+' : ''}{formatCurrency(diff)}</>
              )}
            </td>
          </>
        )}
      </tr>
    );
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '12px 24px',
    border: 'none',
    borderBottom: isActive ? '3px solid #2563EB' : '3px solid transparent',
    background: isActive ? '#EFF6FF' : 'transparent',
    color: isActive ? '#2563EB' : '#6B7280',
    fontWeight: isActive ? '600' : '400' as const,
    cursor: 'pointer',
    fontSize: '15px',
    transition: 'all 0.2s',
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: compareMode ? '1400px' : '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ marginBottom: '8px' }}>UK Tax Calculator</h1>
          <p style={{ color: '#6B7280' }}>2025/26 Tax Year</p>
        </div>
        {activeTab === 'salary' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#EFF6FF', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={compareMode}
              onChange={(e) => setCompareMode(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontWeight: '500' }}>📊 Compare Scenarios</span>
          </label>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #E5E7EB', marginBottom: '24px' }}>
        <button style={tabStyle(activeTab === 'salary')} onClick={() => setActiveTab('salary')}>
          💼 Salary Calculator
        </button>
        <button style={tabStyle(activeTab === 'house')} onClick={() => setActiveTab('house')}>
          🏠 House Purchase
        </button>
        <button style={tabStyle(activeTab === 'projections')} onClick={() => setActiveTab('projections')}>
          📈 Projections
        </button>
      </div>

      {/* Salary Calculator Tab */}
      {activeTab === 'salary' && (
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px' }}>
        {/* Input Form */}
        <div>
          {/* Basic Info */}
          <div style={sectionStyle}>
            <h2 style={sectionHeaderStyle}>💼 Income & Pension</h2>

            {compareMode ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Scenario A</div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Gross Salary</label>
                      <input
                        type="number"
                        value={grossSalary}
                        onChange={(e) => setGrossSalary(safeNumber(e.target.value, 0))}
                        style={inputStyle}
                      />
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Your Pension %</label>
                      <input
                        type="number"
                        value={employeePensionPercentage}
                        onChange={(e) => setEmployeePensionPercentage(safeNumber(e.target.value, 0))}
                        style={inputStyle}
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#2563EB', marginBottom: '4px' }}>Scenario B</div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Gross Salary</label>
                      <input
                        type="number"
                        value={grossSalaryB}
                        onChange={(e) => setGrossSalaryB(safeNumber(e.target.value, 0))}
                        style={{ ...inputStyle, borderColor: '#2563EB' }}
                      />
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Your Pension %</label>
                      <input
                        type="number"
                        value={employeePensionPercentageB}
                        onChange={(e) => setEmployeePensionPercentageB(safeNumber(e.target.value, 0))}
                        style={{ ...inputStyle, borderColor: '#2563EB' }}
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={fieldStyle}>
                <label style={labelStyle}>Annual Gross Salary</label>
                <input
                  type="number"
                  value={grossSalary}
                  onChange={(e) => setGrossSalary(safeNumber(e.target.value, 0))}
                  style={inputStyle}
                />
              </div>
            )}

            <div style={fieldStyle}>
              <label style={labelStyle}>Tax Region</label>
              <select
                value={taxRegion}
                onChange={(e) => setTaxRegion(e.target.value as TaxRegion)}
                style={inputStyle}
              >
                <option value="scotland">Scotland</option>
                <option value="england">England & Wales</option>
              </select>
            </div>

            {!compareMode && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Your Pension %</label>
                  <input
                    type="number"
                    value={employeePensionPercentage}
                    onChange={(e) => setEmployeePensionPercentage(safeNumber(e.target.value, 0))}
                    style={inputStyle}
                    min="0"
                    max="100"
                  />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Employer Pension %</label>
                  <input
                    type="number"
                    value={employerPensionPercentage}
                    onChange={(e) => setEmployerPensionPercentage(safeNumber(e.target.value, 0))}
                    style={inputStyle}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            )}

            {compareMode && (
              <div style={fieldStyle}>
                <label style={labelStyle}>Employer Pension % (both)</label>
                <input
                  type="number"
                  value={employerPensionPercentage}
                  onChange={(e) => setEmployerPensionPercentage(safeNumber(e.target.value, 0))}
                  style={inputStyle}
                  min="0"
                  max="100"
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Current Age</label>
                <input
                  type="number"
                  value={currentAge}
                  onChange={(e) => setCurrentAge(safeNumber(e.target.value, 35))}
                  style={inputStyle}
                  min="18"
                  max="100"
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Retirement Age</label>
                <input
                  type="number"
                  value={retirementAge}
                  onChange={(e) => setRetirementAge(safeNumber(e.target.value, 65))}
                  style={inputStyle}
                  min="50"
                  max="100"
                />
              </div>
            </div>
          </div>

          {/* Company Car */}
          <div style={sectionStyle}>
            <h2 style={sectionHeaderStyle}>🚗 Company Car (Salary Sacrifice)</h2>

            {compareMode ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Scenario A */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={hasCompanyCar}
                      onChange={(e) => setHasCompanyCar(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>Scenario A</span>
                  </div>
                  {hasCompanyCar && (
                    <>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Monthly Sacrifice (£)</label>
                        <input
                          type="number"
                          value={carSalarySacrifice}
                          onChange={(e) => setCarSalarySacrifice(safeNumber(e.target.value, 0))}
                          style={inputStyle}
                        />
                      </div>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>P11D Value (£)</label>
                        <input
                          type="number"
                          value={carP11DValue}
                          onChange={(e) => setCarP11DValue(safeNumber(e.target.value, 0))}
                          style={inputStyle}
                        />
                      </div>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>BIK Rate (%)</label>
                        <input
                          type="number"
                          value={carBIKPercentage}
                          onChange={(e) => setCarBIKPercentage(safeNumber(e.target.value, 2))}
                          style={inputStyle}
                          min="0"
                          max="37"
                        />
                      </div>
                    </>
                  )}
                </div>
                {/* Scenario B */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={hasCompanyCarB}
                      onChange={(e) => setHasCompanyCarB(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '12px', color: '#2563EB' }}>Scenario B</span>
                  </div>
                  {hasCompanyCarB && (
                    <>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Monthly Sacrifice (£)</label>
                        <input
                          type="number"
                          value={carSalarySacrificeB}
                          onChange={(e) => setCarSalarySacrificeB(safeNumber(e.target.value, 0))}
                          style={{ ...inputStyle, borderColor: '#2563EB' }}
                        />
                      </div>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>P11D Value (£)</label>
                        <input
                          type="number"
                          value={carP11DValueB}
                          onChange={(e) => setCarP11DValueB(safeNumber(e.target.value, 0))}
                          style={{ ...inputStyle, borderColor: '#2563EB' }}
                        />
                      </div>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>BIK Rate (%)</label>
                        <input
                          type="number"
                          value={carBIKPercentageB}
                          onChange={(e) => setCarBIKPercentageB(safeNumber(e.target.value, 2))}
                          style={{ ...inputStyle, borderColor: '#2563EB' }}
                          min="0"
                          max="37"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    checked={hasCompanyCar}
                    onChange={(e) => setHasCompanyCar(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Enable Company Car</span>
                </div>

                {hasCompanyCar && (
                  <>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Monthly Salary Sacrifice (£)</label>
                      <input
                        type="number"
                        value={carSalarySacrifice}
                        onChange={(e) => setCarSalarySacrifice(safeNumber(e.target.value, 0))}
                        style={inputStyle}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>Car P11D Value (£)</label>
                        <input
                          type="number"
                          value={carP11DValue}
                          onChange={(e) => setCarP11DValue(safeNumber(e.target.value, 0))}
                          style={inputStyle}
                        />
                      </div>
                      <div style={fieldStyle}>
                        <label style={labelStyle}>BIK Rate (%)</label>
                        <input
                          type="number"
                          value={carBIKPercentage}
                          onChange={(e) => setCarBIKPercentage(safeNumber(e.target.value, 2))}
                          style={inputStyle}
                          min="0"
                          max="37"
                        />
                        <span style={{ fontSize: '11px', color: '#6B7280' }}>2% for EVs</span>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Children */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <input
                type="checkbox"
                checked={hasChildren}
                onChange={(e) => setHasChildren(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span>👶 Children</span>
            </div>

            {hasChildren && (
              <>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Number of Children</label>
                  <input
                    type="number"
                    value={numberOfChildren}
                    onChange={(e) => setNumberOfChildren(safeNumber(e.target.value, 1))}
                    style={inputStyle}
                    min="1"
                    max="10"
                  />
                </div>

                {compareMode ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Scenario A</div>
                      <div style={fieldStyle}>
                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={claimsChildBenefitA}
                            onChange={(e) => setClaimsChildBenefitA(e.target.checked)}
                          />
                          Claims Child Benefit
                        </label>
                      </div>
                      <div style={fieldStyle}>
                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={usesTaxFreeChildcareA}
                            onChange={(e) => setUsesTaxFreeChildcareA(e.target.checked)}
                          />
                          Tax-Free Childcare
                        </label>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#2563EB', marginBottom: '8px' }}>Scenario B</div>
                      <div style={fieldStyle}>
                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={claimsChildBenefitB}
                            onChange={(e) => setClaimsChildBenefitB(e.target.checked)}
                          />
                          Claims Child Benefit
                        </label>
                      </div>
                      <div style={fieldStyle}>
                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={usesTaxFreeChildcareB}
                            onChange={(e) => setUsesTaxFreeChildcareB(e.target.checked)}
                          />
                          Tax-Free Childcare
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={fieldStyle}>
                      <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={claimsChildBenefitA}
                          onChange={(e) => setClaimsChildBenefitA(e.target.checked)}
                        />
                        Claiming Child Benefit
                      </label>
                    </div>

                    <div style={fieldStyle}>
                      <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={usesTaxFreeChildcareA}
                          onChange={(e) => setUsesTaxFreeChildcareA(e.target.checked)}
                        />
                        Using Tax-Free Childcare
                      </label>
                      <span style={{ fontSize: '11px', color: '#6B7280' }}>
                        £2k/year per child (lost if ANI &gt; £100k)
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Bonus */}
          <div style={sectionStyle}>
            <h2 style={sectionHeaderStyle}>🎁 Bonus</h2>
            {compareMode ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Scenario A Bonus */}
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Scenario A</div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Bonus Amount (£)</label>
                    <input
                      type="number"
                      value={bonusAmount}
                      onChange={(e) => setBonusAmount(safeNumber(e.target.value, 0))}
                      style={inputStyle}
                    />
                  </div>
                  {bonusAmount > 0 && (
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Sacrifice to Pension (%)</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={bonusSacrificePercentage}
                        onChange={(e) => setBonusSacrificePercentage(safeNumber(e.target.value, 0))}
                        style={{ width: '100%' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280' }}>
                        <span>0%</span>
                        <span style={{ fontWeight: 'bold' }}>{bonusSacrificePercentage}%</span>
                        <span>100%</span>
                      </div>
                      {bonusSacrificePercentage > 0 && (
                        <div style={{ background: '#F0FDF4', padding: '6px', borderRadius: '4px', marginTop: '4px', fontSize: '11px' }}>
                          <div style={{ color: '#166534' }}>
                            Sacrificing: {formatCurrency(bonusAmount * bonusSacrificePercentage / 100)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Scenario B Bonus */}
                <div>
                  <div style={{ fontSize: '12px', color: '#2563EB', marginBottom: '4px' }}>Scenario B</div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Bonus Amount (£)</label>
                    <input
                      type="number"
                      value={bonusAmountB}
                      onChange={(e) => setBonusAmountB(safeNumber(e.target.value, 0))}
                      style={{ ...inputStyle, borderColor: '#2563EB' }}
                    />
                  </div>
                  {bonusAmountB > 0 && (
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Sacrifice to Pension (%)</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={bonusSacrificePercentageB}
                        onChange={(e) => setBonusSacrificePercentageB(safeNumber(e.target.value, 0))}
                        style={{ width: '100%' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280' }}>
                        <span>0%</span>
                        <span style={{ fontWeight: 'bold' }}>{bonusSacrificePercentageB}%</span>
                        <span>100%</span>
                      </div>
                      {bonusSacrificePercentageB > 0 && (
                        <div style={{ background: '#F0FDF4', padding: '6px', borderRadius: '4px', marginTop: '4px', fontSize: '11px' }}>
                          <div style={{ color: '#166534' }}>
                            Sacrificing: {formatCurrency(bonusAmountB * bonusSacrificePercentageB / 100)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Bonus Amount (£)</label>
                  <input
                    type="number"
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(safeNumber(e.target.value, 0))}
                    style={inputStyle}
                  />
                </div>
                {bonusAmount > 0 && (
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Sacrifice to Pension: {bonusSacrificePercentage}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={bonusSacrificePercentage}
                      onChange={(e) => setBonusSacrificePercentage(safeNumber(e.target.value, 0))}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280' }}>
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>
                      Saves tax and NI, reduces ANI
                    </span>
                    {bonusSacrificePercentage > 0 && (
                      <div style={{ background: '#F0FDF4', padding: '8px', borderRadius: '4px', marginTop: '8px', fontSize: '12px' }}>
                        <div style={{ color: '#166534', fontWeight: 'bold' }}>
                          Sacrificing: {formatCurrency(bonusAmount * bonusSacrificePercentage / 100)} → Tax saved: ~{formatCurrency(bonusAmount * bonusSacrificePercentage / 100 * (resultA.combinedMarginalRate / 100))}
                        </div>
                        <div style={{ color: '#6B7280' }}>
                          Added to pension pot instead
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

        </div>

        {/* Results */}
        <div>
          {/* Tax Breakdown */}
          <div style={{ background: '#EFF6FF', padding: '20px', borderRadius: '8px' }}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>
              Tax Breakdown ({taxRegion === 'scotland' ? 'Scotland' : 'England'})
            </h2>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                {compareMode && (
                  <tr style={{ borderBottom: '1px solid #D1D5DB' }}>
                    <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: '600' }}></th>
                    <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: '600', color: '#374151' }}>A ({employeePensionPercentage}%)</th>
                    <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: '600', color: '#2563EB' }}>B ({employeePensionPercentageB}%)</th>
                    <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: '600', color: '#6B7280' }}>Diff</th>
                  </tr>
                )}
              </thead>
              <tbody>
                <CompareRow label="Gross Salary" valueA={resultA.grossSalary} valueB={resultB?.grossSalary ?? null} />
                {resultA.bonusAmount > 0 && (
                  <CompareRow label={resultA.bonusSacrificedToPension > 0 ? "Bonus (sacrificed)" : "Bonus"} valueA={resultA.bonusAmount} valueB={resultB?.bonusAmount ?? null} />
                )}
                <CompareRow label="Employee Pension" valueA={resultA.employeePension} valueB={resultB?.employeePension ?? null} isDeduction />
                {(resultA.carSalarySacrifice > 0 || (resultB?.carSalarySacrifice ?? 0) > 0) && (
                  <CompareRow label="Car Salary Sacrifice" valueA={resultA.carSalarySacrifice} valueB={resultB?.carSalarySacrifice ?? null} isDeduction />
                )}
                <tr
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
                >
                  <td style={{ padding: '6px 0' }}>
                    <span style={{ marginRight: '6px' }}>{showTaxBreakdown ? '▼' : '▶'}</span>
                    Income Tax
                  </td>
                  <td style={{ textAlign: 'right', color: '#DC2626' }}>-{formatCurrency(resultA.incomeTax)}</td>
                  {compareMode && resultB && (
                    <>
                      <td style={{ textAlign: 'right', color: '#DC2626' }}>-{formatCurrency(resultB.incomeTax)}</td>
                      <td style={{ textAlign: 'right', color: resultB.incomeTax - resultA.incomeTax < 0 ? '#059669' : '#DC2626', fontSize: '13px' }}>
                        {resultB.incomeTax - resultA.incomeTax !== 0 && (
                          <>{resultB.incomeTax - resultA.incomeTax > 0 ? '+' : ''}{formatCurrency(resultB.incomeTax - resultA.incomeTax)}</>
                        )}
                      </td>
                    </>
                  )}
                </tr>
                {showTaxBreakdown && getTaxBreakdown(resultA.taxableIncome, taxRegion).map((bracket, idx) => (
                  <tr key={idx} style={{ background: '#F9FAFB', fontSize: '12px' }}>
                    <td style={{ padding: '3px 0 3px 20px', color: '#6B7280' }}>
                      {bracket.bandName} ({bracket.rate}%)
                      <span style={{ color: '#9CA3AF', marginLeft: '4px' }}>
                        £{bracket.min.toLocaleString()}{bracket.max ? ` - £${bracket.max.toLocaleString()}` : '+'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: bracket.taxInBand > 0 ? '#DC2626' : '#9CA3AF' }}>
                      {bracket.taxInBand > 0 ? `-${formatCurrency(bracket.taxInBand)}` : '-'}
                    </td>
                    {compareMode && resultB && (
                      <>
                        <td style={{ textAlign: 'right', color: '#6B7280' }}>
                          {(() => {
                            const bracketB = getTaxBreakdown(resultB.taxableIncome, taxRegion)[idx];
                            return bracketB && bracketB.taxInBand > 0 ? `-${formatCurrency(bracketB.taxInBand)}` : '-';
                          })()}
                        </td>
                        <td></td>
                      </>
                    )}
                  </tr>
                ))}
                <CompareRow label="National Insurance" valueA={resultA.nationalInsurance} valueB={resultB?.nationalInsurance ?? null} isDeduction />
                {(resultA.bikTax > 0 || (resultB?.bikTax ?? 0) > 0) && (
                  <CompareRow label="BIK Tax" valueA={resultA.bikTax} valueB={resultB?.bikTax ?? null} isDeduction />
                )}
                {(adjA.effectiveCharge > 0 || (adjB?.effectiveCharge ?? 0) > 0) && (
                  <CompareRow label="Child Benefit Charge" valueA={adjA.effectiveCharge} valueB={adjB?.effectiveCharge ?? null} isDeduction />
                )}
                <tr style={{ borderTop: '2px solid #374151' }}>
                  <td style={{ padding: '12px 0', fontWeight: 'bold' }}>Annual Take-Home</td>
                  <td style={{ textAlign: 'right', color: '#059669', fontSize: '18px', fontWeight: 'bold' }}>{formatCurrency(adjA.adjustedAnnual)}</td>
                  {compareMode && adjB && (
                    <>
                      <td style={{ textAlign: 'right', color: '#059669', fontSize: '18px', fontWeight: 'bold' }}>{formatCurrency(adjB.adjustedAnnual)}</td>
                      <td style={{ textAlign: 'right', color: adjB.adjustedAnnual - adjA.adjustedAnnual > 0 ? '#059669' : '#DC2626', fontWeight: 'bold' }}>
                        {adjB.adjustedAnnual - adjA.adjustedAnnual > 0 ? '+' : ''}{formatCurrency(adjB.adjustedAnnual - adjA.adjustedAnnual)}
                      </td>
                    </>
                  )}
                </tr>
                <tr>
                  <td style={{ padding: '6px 0' }}>Monthly Take-Home</td>
                  <td style={{ textAlign: 'right', color: '#059669', fontWeight: 'bold' }}>{formatCurrency(adjA.adjustedMonthly)}</td>
                  {compareMode && adjB && (
                    <>
                      <td style={{ textAlign: 'right', color: '#059669', fontWeight: 'bold' }}>{formatCurrency(adjB.adjustedMonthly)}</td>
                      <td style={{ textAlign: 'right', color: adjB.adjustedMonthly - adjA.adjustedMonthly > 0 ? '#059669' : '#DC2626' }}>
                        {adjB.adjustedMonthly - adjA.adjustedMonthly > 0 ? '+' : ''}{formatCurrency(adjB.adjustedMonthly - adjA.adjustedMonthly)}
                      </td>
                    </>
                  )}
                </tr>
                <tr style={{ borderTop: '1px solid #D1D5DB', background: '#F3F4F6' }}>
                  <td colSpan={compareMode ? 4 : 1} style={{ padding: '8px 0 4px', fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>Monthly Breakdown (for comparison)</td>
                </tr>
                <tr style={{ background: '#F3F4F6' }}>
                  <td style={{ padding: '4px 0', fontSize: '13px', color: '#6B7280' }}>Monthly Gross</td>
                  <td style={{ textAlign: 'right', fontSize: '13px', color: '#6B7280' }}>{formatCurrency(resultA.grossSalary / 12)}</td>
                  {compareMode && resultB && (
                    <>
                      <td style={{ textAlign: 'right', fontSize: '13px', color: '#6B7280' }}>{formatCurrency(resultB.grossSalary / 12)}</td>
                      <td></td>
                    </>
                  )}
                </tr>
                <tr style={{ background: '#F3F4F6' }}>
                  <td style={{ padding: '4px 0', fontSize: '13px', color: '#6B7280' }}>Monthly Income Tax</td>
                  <td style={{ textAlign: 'right', fontSize: '13px', color: '#6B7280' }}>{formatCurrency(resultA.incomeTax / 12)}</td>
                  {compareMode && resultB && (
                    <>
                      <td style={{ textAlign: 'right', fontSize: '13px', color: '#6B7280' }}>{formatCurrency(resultB.incomeTax / 12)}</td>
                      <td></td>
                    </>
                  )}
                </tr>
                <tr style={{ background: '#F3F4F6' }}>
                  <td style={{ padding: '4px 0', fontSize: '13px', color: '#6B7280' }}>Monthly NI</td>
                  <td style={{ textAlign: 'right', fontSize: '13px', color: '#6B7280' }}>{formatCurrency(resultA.nationalInsurance / 12)}</td>
                  {compareMode && resultB && (
                    <>
                      <td style={{ textAlign: 'right', fontSize: '13px', color: '#6B7280' }}>{formatCurrency(resultB.nationalInsurance / 12)}</td>
                      <td></td>
                    </>
                  )}
                </tr>
                {(adjA.hasTaxFreeChildcareBenefit || (adjB?.hasTaxFreeChildcareBenefit)) && (
                  <>
                    <tr style={{ background: '#DCFCE7' }}>
                      <td style={{ padding: '6px 0', color: '#166534' }}>Tax-Free Childcare Benefit (monthly)</td>
                      <td style={{ textAlign: 'right', color: adjA.hasTaxFreeChildcareBenefit ? '#166534' : '#6B7280' }}>
                        {adjA.hasTaxFreeChildcareBenefit ? `+${formatCurrency(adjA.taxFreeChildcareBenefitAmount / 12)}` : '-'}
                      </td>
                      {compareMode && resultB && adjB && (
                        <>
                          <td style={{ textAlign: 'right', color: adjB.hasTaxFreeChildcareBenefit ? '#166534' : '#6B7280' }}>
                            {adjB.hasTaxFreeChildcareBenefit ? `+${formatCurrency(adjB.taxFreeChildcareBenefitAmount / 12)}` : '-'}
                          </td>
                          <td style={{ textAlign: 'right', color: '#6B7280' }}></td>
                        </>
                      )}
                    </tr>
                    <tr style={{ fontWeight: 'bold', background: '#DCFCE7' }}>
                      <td style={{ padding: '6px 0', color: '#166534' }}>Effective Annual Cash</td>
                      <td style={{ textAlign: 'right', color: '#166534', fontSize: '16px' }}>{formatCurrency(adjA.effectiveMonthly * 12)}</td>
                      {compareMode && adjB && (
                        <>
                          <td style={{ textAlign: 'right', color: '#166534', fontSize: '16px' }}>{formatCurrency(adjB.effectiveMonthly * 12)}</td>
                          <td style={{ textAlign: 'right', color: (adjB.effectiveMonthly - adjA.effectiveMonthly) * 12 > 0 ? '#059669' : '#DC2626' }}>
                            {(adjB.effectiveMonthly - adjA.effectiveMonthly) * 12 > 0 ? '+' : ''}{formatCurrency((adjB.effectiveMonthly - adjA.effectiveMonthly) * 12)}
                          </td>
                        </>
                      )}
                    </tr>
                    <tr style={{ background: '#DCFCE7' }}>
                      <td style={{ padding: '6px 0', color: '#166534' }}>Effective Monthly Cash</td>
                      <td style={{ textAlign: 'right', color: '#166534' }}>{formatCurrency(adjA.effectiveMonthly)}</td>
                      {compareMode && adjB && (
                        <>
                          <td style={{ textAlign: 'right', color: '#166534' }}>{formatCurrency(adjB.effectiveMonthly)}</td>
                          <td style={{ textAlign: 'right', color: adjB.effectiveMonthly - adjA.effectiveMonthly > 0 ? '#059669' : '#DC2626' }}>
                            {adjB.effectiveMonthly - adjA.effectiveMonthly > 0 ? '+' : ''}{formatCurrency(adjB.effectiveMonthly - adjA.effectiveMonthly)}
                          </td>
                        </>
                      )}
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #D1D5DB', fontSize: '13px', color: '#6B7280' }}>
              <div>ANI: {formatCurrency(resultA.adjustedNetIncome)}{compareMode && resultB && ` → ${formatCurrency(resultB.adjustedNetIncome)}`}</div>
            </div>
          </div>

          {/* Tax Rates & Headroom */}
          <div style={{ background: '#F3E8FF', padding: '20px', borderRadius: '8px', marginTop: '16px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px', color: '#7C3AED' }}>📊 Tax Rates</h3>
            {compareMode && resultB ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Scenario A */}
                <div style={{ background: '#EDE9FE', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', fontWeight: '600' }}>Scenario A</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>Effective</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7C3AED' }}>{resultA.effectiveTaxRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>Marginal</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#DC2626' }}>{resultA.combinedMarginalRate}%</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#6B7280' }}>
                    Tax {resultA.marginalTaxRate}% + NI {resultA.marginalNIRate}%
                  </div>
                </div>
                {/* Scenario B */}
                <div style={{ background: '#DBEAFE', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#2563EB', marginBottom: '8px', fontWeight: '600' }}>Scenario B</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>Effective</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7C3AED' }}>{resultB.effectiveTaxRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>Marginal</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#DC2626' }}>{resultB.combinedMarginalRate}%</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#6B7280' }}>
                    Tax {resultB.marginalTaxRate}% + NI {resultB.marginalNIRate}%
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Effective Tax Rate</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7C3AED' }}>
                    {resultA.effectiveTaxRate.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>
                    Total deductions as % of gross
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Marginal Rate</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#DC2626' }}>
                    {resultA.combinedMarginalRate}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>
                    Tax {resultA.marginalTaxRate}% + NI {resultA.marginalNIRate}%
                  </div>
                </div>
              </div>
            )}

            {/* Headroom to thresholds */}
            {resultA.headroom.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #E9D5FF' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#7C3AED', marginBottom: '8px' }}>
                  Headroom to Key Thresholds
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {resultA.headroom.filter(h => h.headroom > 0).slice(0, 4).map((h, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#6B7280' }}>{h.name}</span>
                      <span style={{ fontWeight: '500', color: h.headroom < 5000 ? '#DC2626' : '#059669' }}>
                        {formatCurrency(h.headroom)} left
                        {h.marginalRateIfExceeded && <span style={{ color: '#6B7280' }}> (then ~{h.marginalRateIfExceeded}%)</span>}
                      </span>
                    </div>
                  ))}
                  {resultA.headroom.filter(h => h.headroom <= 0).slice(0, 2).map((h, idx) => (
                    <div key={`over-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#DC2626' }}>
                      <span>{h.name}</span>
                      <span style={{ fontWeight: '500' }}>
                        {formatCurrency(Math.abs(h.headroom))} over {h.warning && `- ${h.warning}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pension Projections */}
          <div style={{ background: '#F0FDF4', padding: '20px', borderRadius: '8px', marginTop: '16px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px', color: '#166534' }}>📈 Pension Projections</h3>
            <table style={{ width: '100%' }}>
              <tbody>
                <CompareRow label="Annual contribution (you + employer)" valueA={resultA.totalPensionContribution} valueB={resultB?.totalPensionContribution ?? null} />
                <CompareRow label="Pot after 5 years (5% growth)" valueA={resultA.pensionPotAt5Years} valueB={resultB?.pensionPotAt5Years ?? null} />
                <CompareRow label={`Pot at retirement (${retirementAge - currentAge}yr)`} valueA={resultA.pensionPotAtRetirement} valueB={resultB?.pensionPotAtRetirement ?? null} />
              </tbody>
            </table>
          </div>

          {/* Mortgage Capacity */}
          <div style={{ background: '#FEF3C7', padding: '20px', borderRadius: '8px', marginTop: '16px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px', color: '#92400E' }}>🏠 Mortgage Capacity</h3>
            <table style={{ width: '100%' }}>
              <tbody>
                <CompareRow label="Max mortgage (4.5x take-home)" valueA={resultA.maxMortgageCapacity} valueB={resultB?.maxMortgageCapacity ?? null} />
              </tbody>
            </table>
            <div style={{ marginTop: '12px', fontSize: '13px', color: '#92400E' }}>
              See the House Purchase tab for full affordability analysis
            </div>
          </div>

          {/* Warnings */}
          {resultA.cliffEdgeWarnings.length > 0 && (
            <div style={{ background: '#FEF2F2', padding: '20px', borderRadius: '8px', marginTop: '16px' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '16px', color: '#991B1B' }}>⚠️ Cliff Edge Warnings</h3>
              {resultA.cliffEdgeWarnings.map((warning, idx) => (
                <div key={idx} style={{ color: '#991B1B', marginBottom: '8px', fontSize: '14px' }}>
                  {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* House Purchase Tab */}
      {activeTab === 'house' && (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px' }}>
          {/* House Purchase Inputs */}
          <div>
            {/* Income Summary from Salary Tab */}
            <div style={{ ...sectionStyle, background: '#EFF6FF' }}>
              <h2 style={sectionHeaderStyle}>💼 Income Summary</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Your Annual Take-Home:</span>
                <span style={{ fontWeight: 'bold', color: '#059669' }}>{formatCurrency(adjA.adjustedAnnual)}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                Based on {formatCurrency(grossSalary)} gross salary
              </div>
            </div>

            {/* Partner Income */}
            <div style={sectionStyle}>
              <h2 style={sectionHeaderStyle}>👫 Partner Income</h2>
              <div style={fieldStyle}>
                <label style={labelStyle}>Partner Gross Salary (£/year)</label>
                <input
                  type="number"
                  value={partnerGrossSalary}
                  onChange={(e) => setPartnerGrossSalary(safeNumber(e.target.value, 0))}
                  style={inputStyle}
                />
                <span style={{ fontSize: '11px', color: '#6B7280' }}>
                  Enter 0 if no partner or single applicant
                </span>
              </div>
              {partnerGrossSalary > 0 && resultA.housePurchase && (
                <div style={{ background: '#F0FDF4', padding: '12px', borderRadius: '6px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Partner take-home:</span>
                    <span style={{ fontWeight: 'bold' }}>{formatCurrency(resultA.housePurchase.partnerAnnualTakeHome)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#166534' }}>
                    <span>Combined take-home:</span>
                    <span>{formatCurrency(resultA.housePurchase.combinedAnnualTakeHome)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Property Details */}
            <div style={sectionStyle}>
              <h2 style={sectionHeaderStyle}>🏠 Property Details</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Purchase Price (£)</label>
                  <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(safeNumber(e.target.value, 0))} style={inputStyle} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Valuation (£)</label>
                  <input type="number" value={houseValuation} onChange={(e) => setHouseValuation(safeNumber(e.target.value, 0))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Deposit (%)</label>
                  <input type="number" value={depositPercentage} onChange={(e) => setDepositPercentage(safeNumber(e.target.value, 10))} style={inputStyle} min="5" max="100" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Tax Region</label>
                  <select value={taxRegion} onChange={(e) => setTaxRegion(e.target.value as TaxRegion)} style={inputStyle}>
                    <option value="scotland">Scotland (LBTT)</option>
                    <option value="england">England (Stamp Duty)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cash Position */}
            <div style={sectionStyle}>
              <h2 style={sectionHeaderStyle}>💰 Cash Position</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Current Savings (£)</label>
                  <input type="number" value={currentBalance} onChange={(e) => setCurrentBalance(safeNumber(e.target.value, 0))} style={inputStyle} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Moving Costs (£)</label>
                  <input type="number" value={movingCosts} onChange={(e) => setMovingCosts(safeNumber(e.target.value, 0))} style={inputStyle} />
                </div>
              </div>
              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '12px', marginTop: '8px' }}>
                <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>Current Property (if selling)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Sale Price (£)</label>
                    <input type="number" value={currentHouseSalePrice} onChange={(e) => setCurrentHouseSalePrice(safeNumber(e.target.value, 0))} style={inputStyle} />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Remaining Mortgage (£)</label>
                    <input type="number" value={currentHouseMortgage} onChange={(e) => setCurrentHouseMortgage(safeNumber(e.target.value, 0))} style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>

            {/* Mortgage Terms */}
            <div style={sectionStyle}>
              <h2 style={sectionHeaderStyle}>📋 Mortgage Terms</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Interest Rate (%)</label>
                  <input type="number" value={mortgageInterestRate} onChange={(e) => setMortgageInterestRate(safeNumber(e.target.value, 4.5))} style={inputStyle} step="0.1" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Term (years)</label>
                  <input type="number" value={mortgageTerm} onChange={(e) => setMortgageTerm(safeNumber(e.target.value, 25))} style={inputStyle} min="5" max="40" />
                </div>
              </div>
            </div>
          </div>

          {/* House Purchase Results */}
          <div>
            {resultA.housePurchase ? (
              <>
                {/* Affordability Summary */}
                <div style={{ background: resultA.housePurchase.canAfford ? '#F0FDF4' : '#FEF2F2', padding: '20px', borderRadius: '8px' }}>
                  <h2 style={{ marginBottom: '16px', fontSize: '18px', color: resultA.housePurchase.canAfford ? '#166534' : '#991B1B' }}>
                    {resultA.housePurchase.canAfford ? '✓ Affordable' : '✗ Not Affordable'}
                  </h2>
                  {resultA.housePurchase.affordabilityIssues.length > 0 && (
                    <ul style={{ margin: '0 0 16px 0', paddingLeft: '20px', fontSize: '14px', color: '#991B1B' }}>
                      {resultA.housePurchase.affordabilityIssues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Mortgage Analysis */}
                <div style={{ background: '#EFF6FF', padding: '20px', borderRadius: '8px', marginTop: '16px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>📊 Mortgage Analysis</h3>
                  <table style={{ width: '100%' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '8px 0' }}>Your take-home</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(resultA.housePurchase.yourAnnualTakeHome)}</td>
                      </tr>
                      {partnerGrossSalary > 0 && (
                        <tr>
                          <td style={{ padding: '8px 0' }}>Partner take-home</td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(resultA.housePurchase.partnerAnnualTakeHome)}</td>
                        </tr>
                      )}
                      <tr style={{ fontWeight: 'bold', borderTop: '1px solid #D1D5DB' }}>
                        <td style={{ padding: '8px 0' }}>Combined annual income</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(resultA.housePurchase.combinedAnnualTakeHome)}</td>
                      </tr>
                      <tr style={{ background: '#DBEAFE' }}>
                        <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Max mortgage (4.5x)</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '18px' }}>{formatCurrency(resultA.housePurchase.maxMortgageCapacity)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 0' }}>Mortgage needed</td>
                        <td style={{ textAlign: 'right', color: resultA.housePurchase.mortgageNeeded <= resultA.housePurchase.maxMortgageCapacity ? '#059669' : '#DC2626' }}>
                          {formatCurrency(resultA.housePurchase.mortgageNeeded)}
                          {resultA.housePurchase.mortgageNeeded <= resultA.housePurchase.maxMortgageCapacity ? ' ✓' : ' ✗'}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 0' }}>Monthly repayment</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(resultA.housePurchase.monthlyRepayment)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 0' }}>% of monthly take-home</td>
                        <td style={{ textAlign: 'right', color: resultA.housePurchase.isMonthlyAffordable ? '#059669' : '#DC2626' }}>
                          {resultA.housePurchase.monthlyRepaymentPercentage.toFixed(1)}%
                          {resultA.housePurchase.isMonthlyAffordable ? ' ✓' : ' ✗'}
                          <span style={{ fontSize: '11px', color: '#6B7280', marginLeft: '4px' }}>(max {constants.monthlyAffordabilityThreshold * 100}%)</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Cash Required */}
                <div style={{ background: '#FEF3C7', padding: '20px', borderRadius: '8px', marginTop: '16px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '16px', color: '#92400E' }}>💰 Cash Required</h3>
                  <table style={{ width: '100%' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px 0' }}>Purchase price</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(purchasePrice)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 0' }}>Less: Mortgage</td>
                        <td style={{ textAlign: 'right', color: '#059669' }}>-{formatCurrency(resultA.housePurchase.mortgageNeeded)}</td>
                      </tr>
                      <tr style={{ borderTop: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '6px 0' }}>Cash for property</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(purchasePrice - resultA.housePurchase.mortgageNeeded)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 0' }}>{taxRegion === 'scotland' ? 'LBTT' : 'Stamp Duty'}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(resultA.housePurchase.lbttOrStampDuty)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 0' }}>Moving costs</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(movingCosts)}</td>
                      </tr>
                      <tr style={{ fontWeight: 'bold', borderTop: '1px solid #D1D5DB' }}>
                        <td style={{ padding: '8px 0' }}>Total required</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(resultA.housePurchase.totalCashRequired)}</td>
                      </tr>
                    </tbody>
                  </table>
                  {(purchasePrice - resultA.housePurchase.mortgageNeeded) > (purchasePrice * depositPercentage / 100) && (
                    <div style={{ marginTop: '12px', padding: '8px', background: '#FEF2F2', borderRadius: '4px', fontSize: '12px', color: '#991B1B' }}>
                      Note: Cash needed exceeds {depositPercentage}% deposit (£{(purchasePrice * depositPercentage / 100).toLocaleString()}) because mortgage is capped at your max borrowing capacity.
                    </div>
                  )}
                </div>

                {/* Cash Available */}
                <div style={{ background: resultA.housePurchase.cashSurplusOrShortfall >= 0 ? '#F0FDF4' : '#FEF2F2', padding: '20px', borderRadius: '8px', marginTop: '16px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '16px', color: resultA.housePurchase.cashSurplusOrShortfall >= 0 ? '#166534' : '#991B1B' }}>
                    💵 Cash Position
                  </h3>
                  <table style={{ width: '100%' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px 0' }}>Current savings</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(currentBalance)}</td>
                      </tr>
                      {currentHouseSalePrice > 0 && (
                        <>
                          <tr>
                            <td style={{ padding: '6px 0' }}>House sale proceeds</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(currentHouseSalePrice)}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '6px 0' }}>Less mortgage to clear</td>
                            <td style={{ textAlign: 'right', color: '#DC2626' }}>-{formatCurrency(currentHouseMortgage)}</td>
                          </tr>
                        </>
                      )}
                      <tr style={{ fontWeight: 'bold', borderTop: '1px solid #D1D5DB' }}>
                        <td style={{ padding: '8px 0' }}>Total available</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(resultA.housePurchase.cashAvailable)}</td>
                      </tr>
                      <tr style={{ fontWeight: 'bold', fontSize: '18px', background: resultA.housePurchase.cashSurplusOrShortfall >= 0 ? '#DCFCE7' : '#FEE2E2' }}>
                        <td style={{ padding: '12px 0' }}>{resultA.housePurchase.cashSurplusOrShortfall >= 0 ? 'Surplus' : 'Shortfall'}</td>
                        <td style={{ textAlign: 'right', color: resultA.housePurchase.cashSurplusOrShortfall >= 0 ? '#166534' : '#DC2626' }}>
                          {formatCurrency(Math.abs(resultA.housePurchase.cashSurplusOrShortfall))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div style={{ background: '#F3F4F6', padding: '40px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
                <p style={{ color: '#6B7280' }}>Enter property details to see affordability analysis</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Projections Tab */}
      {activeTab === 'projections' && (
        <ProjectionsTab
          baseSalary={grossSalary}
          taxRegion={taxRegion}
          employeePensionPercentage={employeePensionPercentage}
          employerPensionPercentage={employerPensionPercentage}
          currentAge={currentAge}
          retirementAge={retirementAge}
          hasChildren={hasChildren}
          numberOfChildren={numberOfChildren}
        />
      )}
    </div>
  );
}

export default App;
