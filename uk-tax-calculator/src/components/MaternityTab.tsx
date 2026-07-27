import { useMemo } from 'react';
import type {
  MaternityState,
  SalaryState,
  ChildrenState,
  CompanyCarState,
  BonusState,
  Partner2State,
} from '../types/appState';
import type {
  LeavePayBand,
  LeavePayMode,
  MaternityInputs,
  ParentLeavePlan,
  ParentProfile,
  WeekStatus,
} from '../types/maternity';
import { DEFAULT_TAX_YEAR } from '../data/taxYears';
import { calculateMaternityResults, calculateSharedPots } from '../lib/calculator/maternityPay';
import { formatCurrency, safeNumber } from '../lib/utils/formatters';

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm box-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelCls = 'block mb-1 font-medium text-gray-700 text-sm';
const fieldCls = 'mb-3';
const sectionCls = 'bg-gray-50 p-4 rounded-lg mb-4';
const sectionHeaderCls = 'flex items-center gap-2 mb-3 text-base font-semibold';

const statusStyles: Record<WeekStatus, string> = {
  working: 'text-gray-500',
  maternity: 'text-purple-700 font-medium',
  paternity: 'text-blue-700 font-medium',
  shared: 'text-teal-700 font-medium',
  unpaid: 'text-red-600 font-medium',
};

interface MaternityTabProps {
  maternity: MaternityState;
  setMaternity: (value: MaternityState | ((prev: MaternityState) => MaternityState)) => void;
  salary: SalaryState;
  companyCar: CompanyCarState;
  bonus: BonusState;
  partner2: Partner2State;
  children: ChildrenState;
}

export function MaternityTab({
  maternity,
  setMaternity,
  salary,
  companyCar,
  bonus,
  partner2,
  children,
}: MaternityTabProps) {
  const update = (updates: Partial<MaternityState>) =>
    setMaternity(prev => ({ ...prev, ...updates }));

  const updatePlan = (which: 'plan1' | 'plan2', updates: Partial<ParentLeavePlan>) =>
    setMaternity(prev => ({ ...prev, [which]: { ...prev[which], ...updates } }));

  // Both profiles come from the Salary tab; this tab only plans the leave.
  const parent1: ParentProfile = useMemo(() => ({
    label: 'Partner 1',
    grossSalary: salary.grossSalary,
    taxRegion: salary.taxRegion,
    employeePensionPercentage: salary.employeePensionPercentage,
    employerPensionPercentage: salary.employerPensionPercentage,
    studentLoanPlan: salary.studentLoanPlan ?? 'none',
    hasPostgradLoan: salary.hasPostgradLoan ?? false,
    currentAge: salary.currentAge,
    retirementAge: salary.retirementAge,
    bonusAmount: bonus.bonusAmount,
    bonusSacrificePercentage: bonus.bonusSacrificePercentage,
    hasCompanyCar: companyCar.hasCompanyCar,
    carSalarySacrificeAnnual: companyCar.hasCompanyCar ? companyCar.carSalarySacrifice * 12 : 0,
    carP11DValue: companyCar.carP11DValue,
    carBIKPercentage: companyCar.carBIKPercentage,
    carAllowanceAnnual: (companyCar.carAllowance ?? 0) * 12,
  }), [salary, companyCar, bonus]);

  const parent2: ParentProfile = useMemo(() => ({
    label: 'Partner 2',
    grossSalary: partner2.enabled ? partner2.grossSalary : 0,
    taxRegion: partner2.taxRegion,
    employeePensionPercentage: partner2.employeePensionPercentage,
    employerPensionPercentage: partner2.employerPensionPercentage,
    studentLoanPlan: partner2.studentLoanPlan ?? 'none',
    hasPostgradLoan: partner2.hasPostgradLoan ?? false,
    currentAge: partner2.currentAge,
    retirementAge: partner2.retirementAge,
    bonusAmount: partner2.bonus.bonusAmount,
    bonusSacrificePercentage: partner2.bonus.bonusSacrificePercentage,
    hasCompanyCar: partner2.companyCar.hasCompanyCar,
    carSalarySacrificeAnnual: partner2.companyCar.hasCompanyCar
      ? partner2.companyCar.carSalarySacrifice * 12
      : 0,
    carP11DValue: partner2.companyCar.carP11DValue,
    carBIKPercentage: partner2.companyCar.carBIKPercentage,
    carAllowanceAnnual: (partner2.companyCar.carAllowance ?? 0) * 12,
  }), [partner2]);

  const inputs: MaternityInputs = useMemo(() => ({
    birthDate: maternity.birthDate,
    hasChildren: true,
    numberOfChildren: children.hasChildren ? children.numberOfChildren : 1,
    claimsChildBenefit: children.claimsChildBenefitA,
    usesTaxFreeChildcare: children.usesTaxFreeChildcareA,
    parent1,
    parent2,
    plan1: maternity.plan1,
    plan2: maternity.plan2,
  }), [maternity, children, parent1, parent2]);

  const results = useMemo(() => calculateMaternityResults(inputs), [inputs]);

  const pots = useMemo(
    () => calculateSharedPots(maternity.plan1, DEFAULT_TAX_YEAR),
    [maternity.plan1]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-[400px_1fr] gap-6">
      {/* ─── Inputs ─── */}
      <div>
        <div className={`${sectionCls} !bg-blue-50`}>
          <h2 className={sectionHeaderCls}>👶 The Baby</h2>
          <div className={fieldCls}>
            <label className={labelCls}>Due / birth date</label>
            <input
              type="date"
              value={maternity.birthDate}
              onChange={e => update({ birthDate: e.target.value })}
              className={inputCls}
            />
            <span className="text-[11px] text-gray-500">
              Leave is modelled week by week from this date, so it splits across tax years correctly.
            </span>
          </div>
          <div className="text-[11px] text-gray-500">
            Children ({inputs.numberOfChildren}), Child Benefit and Tax-Free Childcare settings come
            from the Salary tab.
          </div>
        </div>

        {/* Partner 1 — birth parent */}
        <div className={sectionCls}>
          <h2 className={sectionHeaderCls}>Partner 1 (birth parent)</h2>
          <ProfileSummary profile={parent1} />

          <div className="grid grid-cols-2 gap-3">
            <div className={fieldCls}>
              <label className={labelCls}>Maternity leave (weeks)</label>
              <input
                type="number"
                min={0}
                max={52}
                value={maternity.plan1.maternityLeaveWeeks}
                onChange={e =>
                  updatePlan('plan1', { maternityLeaveWeeks: safeNumber(e.target.value) })
                }
                className={inputCls}
              />
              <span className="text-[11px] text-gray-500">Max 52; only 39 are ever paid</span>
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Starts (weeks vs birth)</label>
              <input
                type="number"
                min={-11}
                max={0}
                value={maternity.plan1.startWeekOffset}
                onChange={e => updatePlan('plan1', { startWeekOffset: safeNumber(e.target.value) })}
                className={inputCls}
              />
              <span className="text-[11px] text-gray-500">-2 starts two weeks early</span>
            </div>
          </div>

          <PayBandEditor
            bands={maternity.plan1.payBands}
            onChange={bands => updatePlan('plan1', { payBands: bands })}
          />

          <ReturnAndPension
            plan={maternity.plan1}
            profile={parent1}
            normalPensionPercent={parent1.employeePensionPercentage}
            onChange={updates => updatePlan('plan1', updates)}
          />
        </div>

        {/* Partner 2 */}
        <div className={sectionCls}>
          <h2 className={sectionHeaderCls}>Partner 2</h2>

          {!partner2.enabled ? (
            <p className="text-[13px] text-gray-500">
              No second earner. Add Partner 2 on the Salary tab to plan their leave.
            </p>
          ) : (
            <>
              <ProfileSummary profile={parent2} />

              <div className="grid grid-cols-2 gap-3">
                <div className={fieldCls}>
                  <label className={labelCls}>Paternity leave (weeks)</label>
                  <input
                    type="number"
                    min={0}
                    max={2}
                    value={maternity.plan2.paternityLeaveWeeks}
                    onChange={e =>
                      updatePlan('plan2', { paternityLeaveWeeks: safeNumber(e.target.value) })
                    }
                    className={inputCls}
                  />
                  <span className="text-[11px] text-gray-500">Separate from the shared pots</span>
                </div>
                <div className={fieldCls}>
                  <label className={labelCls}>Starts (weeks after birth)</label>
                  <input
                    type="number"
                    min={0}
                    value={maternity.plan2.startWeekOffset}
                    onChange={e => updatePlan('plan2', { startWeekOffset: safeNumber(e.target.value) })}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Shared parental leave, with its own start and live pot balances */}
              <div className="bg-teal-50 p-3 rounded-md mb-3">
                <div className="font-semibold text-sm mb-2">Shared Parental Leave</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Leave weeks</label>
                    <input
                      type="number"
                      min={0}
                      value={maternity.plan2.sharedLeaveWeeksTaken}
                      onChange={e =>
                        updatePlan('plan2', { sharedLeaveWeeksTaken: safeNumber(e.target.value) })
                      }
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Of which paid (ShPP)</label>
                    <input
                      type="number"
                      min={0}
                      value={maternity.plan2.sharedPaidWeeksTaken}
                      onChange={e =>
                        updatePlan('plan2', { sharedPaidWeeksTaken: safeNumber(e.target.value) })
                      }
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Shared leave starts (weeks after birth)</label>
                  <input
                    type="number"
                    min={0}
                    max={52}
                    value={maternity.plan2.sharedStartWeekOffset}
                    onChange={e =>
                      updatePlan('plan2', { sharedStartWeekOffset: safeNumber(e.target.value) })
                    }
                    className={inputCls}
                  />
                  <span className="text-[11px] text-gray-500">
                    Independent of the paternity weeks — take two weeks at the birth and shared
                    leave months later.
                  </span>
                </div>
                <div className="text-[11px] text-gray-600 mt-2 leading-relaxed">
                  Partner 1 taking {maternity.plan1.maternityLeaveWeeks} weeks releases{' '}
                  <strong>{pots.leaveAvailable} leave weeks</strong> and{' '}
                  <strong>{pots.paidAvailable} paid weeks</strong>.
                  <br />
                  Used: {results.sharedPots.leaveUsed} of {pots.leaveAvailable} leave ·{' '}
                  {results.sharedPots.paidUsed} of {pots.paidAvailable} paid. Leave taken beyond
                  the paid pot is unpaid.
                </div>
              </div>

              <PayBandEditor
                bands={maternity.plan2.payBands}
                onChange={bands => updatePlan('plan2', { payBands: bands })}
              />

              <ReturnAndPension
                plan={maternity.plan2}
                profile={parent2}
                normalPensionPercent={parent2.employeePensionPercentage}
                onChange={updates => updatePlan('plan2', updates)}
              />
            </>
          )}
        </div>
      </div>


      {/* ─── Results ─── */}
      <div>
        {/* Headline */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard
            label="Gross pay given up"
            value={formatCurrency(results.grossDrop)}
            tone="neutral"
          />
          <StatCard
            label="Actual take-home drop"
            value={formatCurrency(results.netDrop)}
            tone="bad"
          />
          <StatCard
            label="Tax & NI saved"
            value={formatCurrency(results.taxSaved)}
            tone="good"
          />
          <StatCard
            label="Net cost per week off"
            value={formatCurrency(results.netCostPerWeekOfLeave)}
            tone="neutral"
            sub={`${results.totalLeaveWeeks.toFixed(0)} weeks between you`}
          />
        </div>

        {results.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mb-4">
            {results.warnings.map((warning, i) => (
              <div key={i} className="text-[13px] text-amber-900 mb-1 last:mb-0">
                ⚠️ {warning}
              </div>
            ))}
          </div>
        )}

        {/* Monthly timeline */}
        <div className={sectionCls}>
          <h2 className={sectionHeaderCls}>Month-by-month take-home</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b-2 border-gray-300 text-left">
                  <th className="py-2 pr-2">Month</th>
                  <th className="py-2 pr-2">Partner 1</th>
                  <th className="py-2 pr-2 text-right">Take-home</th>
                  <th className="py-2 pr-2">Partner 2</th>
                  <th className="py-2 pr-2 text-right">Take-home</th>
                  <th className="py-2 pr-2 text-right">Household</th>
                  <th className="py-2 text-right">vs normal</th>
                </tr>
              </thead>
              <tbody>
                {results.monthlyCashflow.map((row, i) => {
                  const diff = row.householdNet - row.householdNetBaseline;
                  const isLowest =
                    results.lowestMonthlyHouseholdNet?.monthLabel === row.monthLabel;
                  return (
                    <tr
                      key={`${row.taxYear}-${row.taxMonth}-${i}`}
                      className={`border-b border-gray-200 ${isLowest ? 'bg-amber-50' : ''}`}
                    >
                      <td className="py-1.5 pr-2 whitespace-nowrap">
                        {row.monthLabel}
                        {isLowest && <span className="ml-1 text-[11px] text-amber-700">tightest</span>}
                      </td>
                      <td className={`py-1.5 pr-2 ${statusStyles[row.parent1.status]}`}>
                        {row.parent1.payLabel}
                      </td>
                      <td className="py-1.5 pr-2 text-right">{formatCurrency(row.parent1.takeHome)}</td>
                      <td className={`py-1.5 pr-2 ${statusStyles[row.parent2.status]}`}>
                        {row.parent2.payLabel}
                      </td>
                      <td className="py-1.5 pr-2 text-right">{formatCurrency(row.parent2.takeHome)}</td>
                      <td className="py-1.5 pr-2 text-right font-semibold">
                        {formatCurrency(row.householdNet)}
                      </td>
                      <td
                        className={`py-1.5 text-right ${
                          Math.round(diff) === 0
                            ? 'text-gray-400'
                            : diff < 0
                              ? 'text-red-600'
                              : 'text-emerald-600'
                        }`}
                      >
                        {Math.round(diff) === 0
                          ? '—'
                          : `${diff > 0 ? '+' : '−'}${formatCurrency(Math.abs(diff))}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-gray-500 mt-2">
            PAYE tax months (6th to 5th). Household figures include Child Benefit and Tax-Free
            Childcare spread evenly across the year.
          </div>
        </div>

        {/* Per tax year */}
        {results.taxYears.map(year => (
          <div className={sectionCls} key={year.taxYear}>
            <h2 className={sectionHeaderCls}>
              {year.taxYearLabel}
              {year.isProjected && (
                <span className="text-[11px] font-normal bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                  rates not yet announced
                </span>
              )}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse min-w-[560px]">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="py-2 text-left"></th>
                    <th className="py-2 text-right">Partner 1</th>
                    <th className="py-2 text-right">Partner 2</th>
                    <th className="py-2 text-right">Both</th>
                    <th className="py-2 text-right">Normally</th>
                    <th className="py-2 text-right">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <YearRow
                    label="Gross pay"
                    a={year.parent1.grossPay}
                    b={year.parent2.grossPay}
                    baseline={year.parent1Baseline.grossPay + year.parent2Baseline.grossPay}
                  />
                  <YearRow
                    label="Income tax"
                    a={year.parent1.incomeTax}
                    b={year.parent2.incomeTax}
                    baseline={year.parent1Baseline.incomeTax + year.parent2Baseline.incomeTax}
                    isDeduction
                  />
                  <YearRow
                    label="National Insurance"
                    a={year.parent1.nationalInsurance}
                    b={year.parent2.nationalInsurance}
                    baseline={
                      year.parent1Baseline.nationalInsurance + year.parent2Baseline.nationalInsurance
                    }
                    isDeduction
                  />
                  {(year.parent1.studentLoan > 0 || year.parent2.studentLoan > 0) && (
                    <YearRow
                      label="Student loan"
                      a={year.parent1.studentLoan}
                      b={year.parent2.studentLoan}
                      baseline={year.parent1Baseline.studentLoan + year.parent2Baseline.studentLoan}
                      isDeduction
                    />
                  )}
                  <YearRow
                    label="Employee pension"
                    a={year.parent1.employeePension}
                    b={year.parent2.employeePension}
                    baseline={
                      year.parent1Baseline.employeePension + year.parent2Baseline.employeePension
                    }
                    isDeduction
                  />
                  <YearRow
                    label="Adjusted Net Income"
                    a={year.parent1.adjustedNetIncome}
                    b={year.parent2.adjustedNetIncome}
                    baseline={
                      year.parent1Baseline.adjustedNetIncome + year.parent2Baseline.adjustedNetIncome
                    }
                  />
                  <YearRow
                    label="Take-home pay"
                    a={year.parent1.takeHome}
                    b={year.parent2.takeHome}
                    baseline={year.parent1Baseline.takeHome + year.parent2Baseline.takeHome}
                    bold
                  />

                  <tr>
                    <td colSpan={6} className="pt-3 pb-1 text-[12px] font-semibold text-gray-500">
                      Household benefits
                    </td>
                  </tr>
                  <BenefitRow
                    label="Child Benefit received"
                    value={year.childBenefitReceived}
                    baseline={year.childBenefitReceived}
                  />
                  <BenefitRow
                    label="High Income Child Benefit Charge"
                    value={-year.childBenefitCharge}
                    baseline={-year.childBenefitChargeBaseline}
                  />
                  <BenefitRow
                    label="Tax-Free Childcare"
                    value={year.taxFreeChildcareBenefit}
                    baseline={year.taxFreeChildcareBenefitBaseline}
                  />
                  <tr className="font-bold border-t border-gray-300">
                    <td className="py-2">Household net income</td>
                    <td className="py-2 text-right text-gray-400" colSpan={2}></td>
                    <td className="py-2 text-right">{formatCurrency(year.householdNet)}</td>
                    <td className="py-2 text-right">{formatCurrency(year.householdNetBaseline)}</td>
                    <td
                      className={`py-2 text-right ${
                        year.householdNet < year.householdNetBaseline
                          ? 'text-red-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {formatCurrency(year.householdNet - year.householdNetBaseline)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="text-[11px] text-gray-500 mt-2">
              The Child Benefit charge falls on whichever partner has the higher Adjusted Net Income
              ({formatCurrency(year.higherAdjustedNetIncome)}). Tax-Free Childcare needs both
              partners at or below £100,000.
            </div>
          </div>
        ))}

        {/* Pension */}
        <div className={sectionCls}>
          <h2 className={sectionHeaderCls}>Pension impact</h2>
          <table className="w-full text-[13px] border-collapse">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-1.5">Employee contributions given up</td>
                <td className="py-1.5 text-right">
                  {formatCurrency(results.pensionForgone.employee)}
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-1.5">Employer contributions given up</td>
                <td className="py-1.5 text-right">
                  {formatCurrency(results.pensionForgone.employer)}
                </td>
              </tr>
              <tr className="font-bold">
                <td className="py-2">Estimated shortfall at retirement</td>
                <td className="py-2 text-right">
                  {formatCurrency(results.pensionForgone.potAtRetirementDifference)}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="text-[11px] text-gray-500 mt-2">
            The shortfall is the missed contributions left to compound at 5% a year until Partner
            1's retirement age ({salary.retirementAge}).
          </div>
        </div>

        {/* Insights */}
        {results.insights.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
            <h2 className={sectionHeaderCls}>What this means</h2>
            {results.insights.map((insight, i) => (
              <div key={i} className="text-[13px] mb-2 last:mb-0 leading-relaxed">
                {insight}
              </div>
            ))}
          </div>
        )}

        <div className="text-[11px] text-gray-500 leading-relaxed">
          <strong>Assumptions:</strong> income tax is calculated on an annual (cumulative PAYE)
          basis; NI and student loan month by month, which is how each is actually assessed.
          Employer schemes are treated as inclusive of statutory pay. Pension contributions during
          leave are modelled as ordinary deductions from actual pay. Keeping-in-touch days,
          Maternity Allowance, adoption pay and actual childcare costs are not modelled.
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───

/** Read-only view of a partner's pay setup, which lives on the Salary tab */
function ProfileSummary({ profile }: { profile: ParentProfile }) {
  const rows: [string, string][] = [
    ['Gross salary', formatCurrency(profile.grossSalary)],
    [
      'Pension',
      `${profile.employeePensionPercentage}% + ${profile.employerPensionPercentage}% employer`,
    ],
  ];
  if (profile.carAllowanceAnnual > 0) {
    rows.push(['Car allowance', `${formatCurrency(profile.carAllowanceAnnual / 12)}/month`]);
  }
  if (profile.hasCompanyCar) {
    rows.push([
      'Company car',
      `${formatCurrency(profile.carSalarySacrificeAnnual / 12)}/month, ${profile.carBIKPercentage}% BIK`,
    ]);
  }
  if (profile.bonusAmount > 0) {
    rows.push(['Bonus', formatCurrency(profile.bonusAmount)]);
  }
  rows.push(['Region', profile.taxRegion === 'scotland' ? 'Scotland' : 'England & Wales']);

  return (
    <div className="bg-white p-3 rounded-md mb-3 text-sm">
      {rows.map(([label, value]) => (
        <div className="flex justify-between mb-1" key={label}>
          <span className="text-gray-500">{label}</span>
          <span className="font-medium">{value}</span>
        </div>
      ))}
      <div className="text-[11px] text-gray-500 mt-2">Edit these on the Salary tab.</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone: 'good' | 'bad' | 'neutral';
  sub?: string;
}) {
  const toneCls =
    tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-gray-900';
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="text-[11px] text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${toneCls}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function YearRow({
  label,
  a,
  b,
  baseline,
  isDeduction = false,
  bold = false,
}: {
  label: string;
  a: number;
  b: number;
  baseline: number;
  isDeduction?: boolean;
  bold?: boolean;
}) {
  const total = a + b;
  const diff = total - baseline;
  const diffIsGood = isDeduction ? diff < 0 : diff > 0;
  const diffCls =
    Math.round(diff) === 0 ? 'text-gray-400' : diffIsGood ? 'text-emerald-600' : 'text-red-600';

  return (
    <tr className={`border-b border-gray-200 ${bold ? 'font-bold' : ''}`}>
      <td className="py-1.5">{label}</td>
      <td className="py-1.5 text-right">{formatCurrency(a)}</td>
      <td className="py-1.5 text-right">{formatCurrency(b)}</td>
      <td className="py-1.5 text-right">{formatCurrency(total)}</td>
      <td className="py-1.5 text-right text-gray-500">{formatCurrency(baseline)}</td>
      <td className={`py-1.5 text-right ${diffCls}`}>
        {Math.round(diff) === 0
          ? '—'
          : `${diff > 0 ? '+' : '−'}${formatCurrency(Math.abs(diff))}`}
      </td>
    </tr>
  );
}

function BenefitRow({
  label,
  value,
  baseline,
}: {
  label: string;
  value: number;
  baseline: number;
}) {
  const diff = value - baseline;
  return (
    <tr className="border-b border-gray-200">
      <td className="py-1.5">{label}</td>
      <td className="py-1.5 text-right text-gray-400" colSpan={2}></td>
      <td className="py-1.5 text-right">{formatCurrency(value)}</td>
      <td className="py-1.5 text-right text-gray-500">{formatCurrency(baseline)}</td>
      <td
        className={`py-1.5 text-right ${
          Math.round(diff) === 0 ? 'text-gray-400' : diff > 0 ? 'text-emerald-600' : 'text-red-600'
        }`}
      >
        {Math.round(diff) === 0
          ? '—'
          : `${diff > 0 ? '+' : '−'}${formatCurrency(Math.abs(diff))}`}
      </td>
    </tr>
  );
}

function PayBandEditor({
  bands,
  onChange,
}: {
  bands: LeavePayBand[];
  onChange: (bands: LeavePayBand[]) => void;
}) {
  const updateBand = (index: number, updates: Partial<LeavePayBand>) =>
    onChange(bands.map((band, i) => (i === index ? { ...band, ...updates } : band)));

  const totalWeeks = bands.reduce((sum, band) => sum + band.weeks, 0);

  return (
    <div className="mb-3">
      <label className={labelCls}>Employer scheme</label>
      {bands.map((band, i) => (
        <div key={i} className="flex gap-2 mb-2 items-center">
          <input
            type="number"
            min={0}
            value={band.weeks}
            onChange={e => updateBand(i, { weeks: safeNumber(e.target.value) })}
            className={`${inputCls} !w-16`}
            aria-label="Weeks"
          />
          <span className="text-[12px] text-gray-500">wks</span>
          <select
            value={band.mode}
            onChange={e => updateBand(i, { mode: e.target.value as LeavePayMode })}
            className={inputCls}
            aria-label="Pay level"
          >
            <option value="fullPay">Full pay</option>
            <option value="percentOfSalary">% of salary</option>
            <option value="statutory">Statutory only</option>
            <option value="unpaid">Unpaid</option>
          </select>
          {band.mode === 'percentOfSalary' && (
            <input
              type="number"
              min={0}
              max={100}
              value={band.percent ?? 50}
              onChange={e => updateBand(i, { percent: safeNumber(e.target.value) })}
              className={`${inputCls} !w-16`}
              aria-label="Percent of salary"
            />
          )}
          <button
            type="button"
            onClick={() => onChange(bands.filter((_, j) => j !== i))}
            className="text-gray-400 hover:text-red-600 px-1 text-lg leading-none"
            aria-label="Remove band"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...bands, { weeks: 13, mode: 'statutory' }])}
        className="text-[13px] text-blue-600 hover:text-blue-800"
      >
        + Add pay period
      </button>
      <div className="text-[11px] text-gray-500 mt-1">
        {totalWeeks} weeks covered. Each week pays the higher of the employer scheme and statutory
        pay — schemes top up rather than stack.
      </div>
    </div>
  );
}

function ReturnAndPension({
  plan,
  profile,
  normalPensionPercent,
  onChange,
}: {
  plan: ParentLeavePlan;
  profile: ParentProfile;
  normalPensionPercent: number;
  onChange: (updates: Partial<ParentLeavePlan>) => void;
}) {
  const hasCar = profile.hasCompanyCar;
  const hasAllowance = profile.carAllowanceAnnual > 0;
  return (
    <>
      <div className={fieldCls}>
        <label className={labelCls}>Salary on return (% of pre-leave)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={plan.returnSalaryPercent}
          onChange={e => onChange({ returnSalaryPercent: safeNumber(e.target.value, 100) })}
          className={inputCls}
        />
        <span className="text-[11px] text-gray-500">100 for full time, 60 for three days a week</span>
      </div>

      <div className="bg-white p-3 rounded-md border border-gray-200">
        <div className="font-semibold text-sm mb-2">Pension during leave</div>
        <div className={fieldCls}>
          <label className={labelCls}>Employee contribution (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={plan.employeePensionPercentDuringLeave}
            onChange={e =>
              onChange({ employeePensionPercentDuringLeave: safeNumber(e.target.value) })
            }
            className={inputCls}
          />
          <span className="text-[11px] text-gray-500">
            Normally {normalPensionPercent}%. Set to 0 to pause contributions while on leave.
          </span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={plan.employerMaintainsPension}
            onChange={e => onChange({ employerMaintainsPension: e.target.checked })}
          />
          <span>Employer keeps contributing on full salary</span>
        </label>
        <div className="text-[11px] text-gray-500 mt-1">
          Required through the paid weeks of statutory leave.
        </div>
      </div>

      {(hasCar || hasAllowance) && (
        <div className="bg-white p-3 rounded-md border border-gray-200 mt-3">
          <div className="font-semibold text-sm mb-2">Car during leave</div>

          {hasCar && (
            <>
              <label className="flex items-center gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={plan.keepCarDuringLeave}
                  onChange={e => onChange({ keepCarDuringLeave: e.target.checked })}
                />
                <span>Keep the car</span>
              </label>
              <div className="text-[11px] text-gray-500 mb-2 -mt-1">
                The benefit-in-kind stays taxable for as long as you hold it.
              </div>

              <label className="flex items-center gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={plan.continueCarSacrificeDuringLeave}
                  onChange={e => onChange({ continueCarSacrificeDuringLeave: e.target.checked })}
                />
                <span>Keep deducting the salary sacrifice</span>
              </label>
            </>
          )}

          {hasAllowance && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={plan.continueCarAllowanceDuringLeave}
                onChange={e => onChange({ continueCarAllowanceDuringLeave: e.target.checked })}
              />
              <span>Keep paying the cash allowance</span>
            </label>
          )}
        </div>
      )}
    </>
  );
}
