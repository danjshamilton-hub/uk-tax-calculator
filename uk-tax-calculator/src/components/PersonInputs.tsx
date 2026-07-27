import type { CompanyCarState, BonusState, PersonalDetails } from '../types/appState';
import type { TaxRegion, StudentLoanPlan } from '../data/taxYears';
import { getStudentLoanPlans, getPostgradLoanConfig, DEFAULT_TAX_YEAR } from '../data/taxYears';
import { safeNumber } from '../lib/utils/formatters';

const baseInput =
  'w-full px-3 py-2 border rounded-md text-sm box-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelCls = 'block mb-1 font-medium text-gray-700 text-sm';
const fieldCls = 'mb-3';
const subHeaderCls = 'text-[13px] font-semibold text-gray-600 mt-4 mb-2';

/** The parts of a person's setup that can differ between scenarios */
export interface PersonScenarioValues {
  grossSalary: number;
  employeePensionPercentage: number;
  employerPensionPercentage: number;
  companyCar: CompanyCarState;
  bonus: BonusState;
}

interface PersonInputsProps {
  values: PersonScenarioValues;
  onChange: (updates: Partial<PersonScenarioValues>) => void;
  onCarChange: (updates: Partial<CompanyCarState>) => void;
  onBonusChange: (updates: Partial<BonusState>) => void;
  /** Blue-bordered inputs, used for Scenario B */
  accent?: boolean;
  /**
   * Details that belong to the person rather than a scenario: region, ages and
   * student loan. Omitted for Scenario B, which inherits them.
   */
  personal?: PersonalDetails & { onChange: (updates: Partial<PersonalDetails>) => void };
}

export function PersonInputs({
  values,
  onChange,
  onCarChange,
  onBonusChange,
  accent = false,
  personal,
}: PersonInputsProps) {
  const inputCls = `${baseInput} ${accent ? 'border-blue-600' : 'border-gray-300'}`;

  return (
    <>
      <div className={fieldCls}>
        <label className={labelCls}>Annual Gross Salary</label>
        <input
          type="number"
          value={values.grossSalary}
          onChange={e => onChange({ grossSalary: safeNumber(e.target.value) })}
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={fieldCls}>
          <label className={labelCls}>Your Pension %</label>
          <input
            type="number"
            value={values.employeePensionPercentage}
            onChange={e => onChange({ employeePensionPercentage: safeNumber(e.target.value) })}
            className={inputCls}
            min="0"
            max="100"
          />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Employer Pension %</label>
          <input
            type="number"
            value={values.employerPensionPercentage}
            onChange={e => onChange({ employerPensionPercentage: safeNumber(e.target.value) })}
            className={inputCls}
            min="0"
            max="100"
          />
        </div>
      </div>

      {personal && (
        <>
          <div className={fieldCls}>
            <label className={labelCls}>Tax Region</label>
            <select
              value={personal.taxRegion}
              onChange={e => personal.onChange({ taxRegion: e.target.value as TaxRegion })}
              className={inputCls}
            >
              <option value="scotland">Scotland</option>
              <option value="england">England &amp; Wales</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={fieldCls}>
              <label className={labelCls}>Current Age</label>
              <input
                type="number"
                value={personal.currentAge}
                onChange={e => personal.onChange({ currentAge: safeNumber(e.target.value, 35) })}
                className={inputCls}
                min="18"
                max="100"
              />
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Retirement Age</label>
              <input
                type="number"
                value={personal.retirementAge}
                onChange={e => personal.onChange({ retirementAge: safeNumber(e.target.value, 65) })}
                className={inputCls}
                min="50"
                max="100"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={(personal.studentLoanPlan ?? 'none') !== 'none'}
              onChange={e =>
                personal.onChange({
                  studentLoanPlan: e.target.checked ? 'plan2' : 'none',
                  hasPostgradLoan: e.target.checked ? personal.hasPostgradLoan : false,
                })
              }
              className="w-[18px] h-[18px]"
            />
            <span>Student Loan</span>
          </label>
          {(personal.studentLoanPlan ?? 'none') !== 'none' && (
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className={fieldCls}>
                <label className={labelCls}>Plan</label>
                <select
                  value={personal.studentLoanPlan}
                  onChange={e =>
                    personal.onChange({ studentLoanPlan: e.target.value as StudentLoanPlan })
                  }
                  className={inputCls}
                >
                  {Object.entries(getStudentLoanPlans(DEFAULT_TAX_YEAR)).map(([id, cfg]) => (
                    <option key={id} value={id}>
                      {cfg.label} — {cfg.rate}% over £{cfg.threshold.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <div className={fieldCls}>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={personal.hasPostgradLoan ?? false}
                    onChange={e => personal.onChange({ hasPostgradLoan: e.target.checked })}
                  />
                  + Postgraduate ({getPostgradLoanConfig(DEFAULT_TAX_YEAR).rate}%)
                </label>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Car ─── */}
      <div className={subHeaderCls}>Car (sacrifice or allowance)</div>

      <div className={fieldCls}>
        <label className={labelCls}>Monthly Car Allowance (cash)</label>
        <input
          type="number"
          value={values.companyCar.carAllowance ?? 0}
          onChange={e => onCarChange({ carAllowance: safeNumber(e.target.value) })}
          className={inputCls}
        />
        <span className="text-[11px] text-gray-500">
          Paid with salary — taxed &amp; NI'd normally, counts towards ANI. Not pensionable.
        </span>
      </div>

      <label className="flex items-center gap-2 mb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={values.companyCar.hasCompanyCar}
          onChange={e => onCarChange({ hasCompanyCar: e.target.checked })}
          className="w-[18px] h-[18px]"
        />
        <span>Company car (salary sacrifice)</span>
      </label>
      {values.companyCar.hasCompanyCar && (
        <>
          <div className={fieldCls}>
            <label className={labelCls}>Monthly Salary Sacrifice</label>
            <input
              type="number"
              value={values.companyCar.carSalarySacrifice}
              onChange={e => onCarChange({ carSalarySacrifice: safeNumber(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={fieldCls}>
              <label className={labelCls}>Car P11D Value</label>
              <input
                type="number"
                value={values.companyCar.carP11DValue}
                onChange={e => onCarChange({ carP11DValue: safeNumber(e.target.value) })}
                className={inputCls}
              />
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>BIK Rate (%)</label>
              <input
                type="number"
                value={values.companyCar.carBIKPercentage}
                onChange={e => onCarChange({ carBIKPercentage: safeNumber(e.target.value, 2) })}
                className={inputCls}
                min="0"
                max="37"
              />
              <span className="text-[11px] text-gray-500">2% for EVs</span>
            </div>
          </div>
        </>
      )}

      {/* ─── Bonus ─── */}
      <div className={subHeaderCls}>Bonus</div>
      <div className="grid grid-cols-2 gap-3">
        <div className={fieldCls}>
          <label className={labelCls}>Annual Bonus</label>
          <input
            type="number"
            value={values.bonus.bonusAmount}
            onChange={e => onBonusChange({ bonusAmount: safeNumber(e.target.value) })}
            className={inputCls}
          />
        </div>
        <div className={fieldCls}>
          <label className={labelCls}>Sacrificed to Pension (%)</label>
          <input
            type="number"
            value={values.bonus.bonusSacrificePercentage}
            onChange={e => onBonusChange({ bonusSacrificePercentage: safeNumber(e.target.value) })}
            className={inputCls}
            min="0"
            max="100"
          />
        </div>
      </div>
    </>
  );
}
