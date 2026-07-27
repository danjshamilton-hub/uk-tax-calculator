// BudgetingTab - Budget management with expenses, savings, and projections

import { useMemo } from 'react';
import type { BudgetExpense, BudgetInputs, ExpenseCategory, PaymentSource, ExpenseFrequency } from '../types/budget';
import {
  calculateBudgetSummary,
  calculateBudgetProjection,
  createDefaultExpense,
} from '../lib/calculator/budget';
import { formatCurrency, safeNumber } from '../lib/utils/formatters';
import { constants } from '../data/constants';

interface BudgetingTabProps {
  yourMonthlyTakeHome: number;
  partnerMonthlyTakeHome: number;
  mortgageMonthlyRepayment: number;
  mortgagePrincipal: number;
  mortgageRate: number;
  mortgageTerm: number;
  // Persisted state from parent
  expenses: BudgetExpense[];
  setExpenses: (expenses: BudgetExpense[]) => void;
  partner2TakeHome: number;
  setPartner2TakeHome: (value: number) => void;
  jointContrib1: number;
  setJointContrib1: (value: number) => void;
  jointContrib2: number;
  setJointContrib2: (value: number) => void;
  mortgageOverride: number | null;
  setMortgageOverride: (value: number | null) => void;
  useMortgageOverride: boolean;
  setUseMortgageOverride: (value: boolean) => void;
  projectionYears: number;
  setProjectionYears: (value: number) => void;
  savingsGrowthRate: number;
  setSavingsGrowthRate: (value: number) => void;
}

// Shared Tailwind class constants
const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm';
const labelCls = 'block mb-1 font-medium text-gray-700 text-sm';
const sectionCls = 'bg-gray-50 p-4 rounded-lg mb-4';
const sectionHeaderCls = 'flex items-center gap-2 mb-3 text-base font-semibold';
const smallInputCls = 'px-2 py-1.5 border border-gray-300 rounded text-[13px] w-full';

function SummaryCard({
  title,
  income,
  expenses,
  savings,
  balance,
  colorCls,
  borderCls,
}: {
  title: string;
  income: number;
  expenses: number;
  savings: number;
  balance: number;
  colorCls: string;
  borderCls: string;
}) {
  return (
    <div className={`bg-white border-2 ${borderCls} rounded-lg p-3 flex-1`}>
      <div className={`text-sm font-semibold ${colorCls} mb-2`}>{title}</div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">Income:</span>
        <span>{formatCurrency(income)}</span>
      </div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">Expenses:</span>
        <span className="text-red-600">-{formatCurrency(expenses)}</span>
      </div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">Savings:</span>
        <span className="text-emerald-600">-{formatCurrency(savings)}</span>
      </div>
      <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1 mt-1">
        <span>Leftover:</span>
        <span className={balance >= 0 ? 'text-emerald-600' : 'text-red-600'}>
          {formatCurrency(balance)}
        </span>
      </div>
    </div>
  );
}

function ExpenseRow({
  expense,
  onUpdate,
  onDelete,
}: {
  expense: BudgetExpense;
  onUpdate: (id: string, updates: Partial<BudgetExpense>) => void;
  onDelete: (id: string) => void;
}) {
  const isSavings = expense.category === 'savings';
  const rowBg = isSavings ? 'bg-green-100 border-green-300' : 'bg-white border-gray-200';
  const categoryBg =
    expense.category === 'savings'
      ? 'bg-green-100'
      : expense.category === 'essential'
        ? 'bg-amber-100'
        : 'bg-indigo-100';

  return (
    <div className={`grid grid-cols-[32px_2fr_90px_90px_110px_90px] gap-2 items-center p-2 rounded mb-1 border ${rowBg}`}>
      <button
        onClick={() => onDelete(expense.id)}
        className="w-7 h-7 border-none bg-red-100 text-red-600 rounded cursor-pointer text-sm"
      >
        X
      </button>
      <input
        type="text"
        value={expense.description}
        onChange={(e) => onUpdate(expense.id, { description: e.target.value })}
        placeholder={isSavings ? 'e.g. ISA Contribution' : 'e.g. Council Tax'}
        className={smallInputCls}
      />
      <div className="flex items-center">
        <span className="text-gray-500 mr-1">£</span>
        <input
          type="number"
          value={expense.amount || ''}
          onChange={(e) => onUpdate(expense.id, { amount: safeNumber(e.target.value, 0) })}
          className={`${smallInputCls} w-20`}
        />
      </div>
      <select
        value={expense.frequency}
        onChange={(e) => onUpdate(expense.id, { frequency: e.target.value as ExpenseFrequency })}
        className={smallInputCls}
      >
        <option value="monthly">Monthly</option>
        <option value="annual">Annual</option>
      </select>
      <select
        value={expense.category}
        onChange={(e) => onUpdate(expense.id, { category: e.target.value as ExpenseCategory })}
        className={`${smallInputCls} ${categoryBg}`}
      >
        <option value="essential">Essential</option>
        <option value="nice-to-have">Nice-to-have</option>
        <option value="savings">Savings</option>
      </select>
      <select
        value={expense.paymentSource}
        onChange={(e) => onUpdate(expense.id, { paymentSource: e.target.value as PaymentSource })}
        className={smallInputCls}
      >
        <option value="joint">Joint</option>
        <option value="partner1">You</option>
        <option value="partner2">Partner</option>
      </select>
    </div>
  );
}

export function BudgetingTab(props: BudgetingTabProps) {
  const partner1TakeHome = props.yourMonthlyTakeHome;
  const partner2TakeHome = props.partner2TakeHome || props.partnerMonthlyTakeHome;

  const jointContrib1 =
    props.jointContrib1 || Math.round(partner1TakeHome * (constants.defaultJointContributionPercent / 100));
  const jointContrib2 =
    props.jointContrib2 || Math.round(partner2TakeHome * (constants.defaultJointContributionPercent / 100));

  // Build budget inputs
  const budgetInputs: BudgetInputs = useMemo(
    () => ({
      partner1MonthlyTakeHome: partner1TakeHome,
      partner2MonthlyTakeHome: partner2TakeHome,
      jointContribution1: jointContrib1,
      jointContribution2: jointContrib2,
      mortgageMonthly: props.mortgageMonthlyRepayment,
      mortgageOverride: props.useMortgageOverride ? props.mortgageOverride : null,
      expenses: props.expenses,
      savingsGrowthRate: props.savingsGrowthRate,
    }),
    [
      partner1TakeHome,
      partner2TakeHome,
      jointContrib1,
      jointContrib2,
      props.mortgageMonthlyRepayment,
      props.useMortgageOverride,
      props.mortgageOverride,
      props.expenses,
      props.savingsGrowthRate,
    ]
  );

  const summary = useMemo(() => calculateBudgetSummary(budgetInputs), [budgetInputs]);
  const projections = useMemo(
    () =>
      calculateBudgetProjection(
        summary,
        props.projectionYears,
        props.savingsGrowthRate,
        props.mortgagePrincipal,
        props.mortgageRate,
        props.mortgageTerm
      ),
    [summary, props.projectionYears, props.savingsGrowthRate, props.mortgagePrincipal, props.mortgageRate, props.mortgageTerm]
  );

  const addExpense = (category: ExpenseCategory = 'essential') => {
    props.setExpenses([...props.expenses, createDefaultExpense(category)]);
  };

  const updateExpense = (id: string, updates: Partial<BudgetExpense>) => {
    props.setExpenses(props.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const deleteExpense = (id: string) => {
    props.setExpenses(props.expenses.filter((e) => e.id !== id));
  };

  const lastProjection = projections.length > 0 ? projections[projections.length - 1] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Inputs */}
      <div>
        {/* Income Section */}
        <div className={sectionCls}>
          <h2 className={sectionHeaderCls}>Income & Contributions</h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={labelCls}>Your Monthly Take-Home</label>
              <input
                type="number"
                value={partner1TakeHome}
                readOnly
                className={`${inputCls} bg-gray-100 text-gray-500`}
              />
              <div className="text-[11px] text-gray-500 mt-0.5">From Salary tab</div>
            </div>
            <div>
              <label className={labelCls}>Partner Monthly Take-Home</label>
              <input
                type="number"
                value={partner2TakeHome}
                onChange={(e) => props.setPartner2TakeHome(safeNumber(e.target.value, 0))}
                className={inputCls}
              />
              <div className="text-[11px] text-gray-500 mt-0.5">
                {props.partner2TakeHome
                  ? 'Manual override — clear to use the Salary tab figure'
                  : 'From Salary tab (Partner 2)'}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-md">
            <div className="text-[13px] font-medium text-blue-600 mb-2">Joint Account Contributions</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`${labelCls} text-xs`}>Your Contribution</label>
                <input
                  type="number"
                  value={jointContrib1}
                  onChange={(e) => props.setJointContrib1(safeNumber(e.target.value, 0))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={`${labelCls} text-xs`}>Partner Contribution</label>
                <input
                  type="number"
                  value={jointContrib2}
                  onChange={(e) => props.setJointContrib2(safeNumber(e.target.value, 0))}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mortgage Section */}
        <div className={sectionCls}>
          <h2 className={sectionHeaderCls}>Mortgage</h2>

          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">From House Tab:</span>
              <span className="font-medium">{formatCurrency(props.mortgageMonthlyRepayment)}/month</span>
            </div>
            {props.mortgagePrincipal > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Principal: {formatCurrency(props.mortgagePrincipal)}</span>
                <span>
                  {props.mortgageRate}% over {props.mortgageTerm} years
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={props.useMortgageOverride}
              onChange={(e) => props.setUseMortgageOverride(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Override mortgage amount</span>
          </div>

          {props.useMortgageOverride && (
            <div className="mt-2">
              <input
                type="number"
                value={props.mortgageOverride || ''}
                onChange={(e) => props.setMortgageOverride(safeNumber(e.target.value, 0))}
                placeholder="Enter monthly amount"
                className={inputCls}
              />
            </div>
          )}
        </div>

        {/* Expenses & Savings Section */}
        <div className={sectionCls}>
          <div className="flex justify-between items-center mb-3">
            <h2 className="flex items-center gap-2 text-base font-semibold">Expenses & Savings</h2>
            <div className="flex gap-2">
              <button
                onClick={() => addExpense('essential')}
                className="px-3 py-1.5 bg-amber-100 border border-amber-500 rounded cursor-pointer text-[13px]"
              >
                + Expense
              </button>
              <button
                onClick={() => addExpense('savings')}
                className="px-3 py-1.5 bg-green-100 border border-green-500 rounded cursor-pointer text-[13px]"
              >
                + Savings
              </button>
            </div>
          </div>

          {props.expenses.length === 0 ? (
            <div className="text-center p-6 text-gray-500 bg-white rounded-md border border-dashed border-gray-300">
              No expenses or savings added yet. Click the buttons above to add items.
            </div>
          ) : (
            <div>
              {/* Header row */}
              <div className="grid grid-cols-[32px_2fr_90px_90px_110px_90px] gap-2 px-2 py-1 text-[11px] text-gray-500 font-medium">
                <span></span>
                <span>Description</span>
                <span>Amount</span>
                <span>Frequency</span>
                <span>Category</span>
                <span>Paid From</span>
              </div>
              {props.expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  onUpdate={updateExpense}
                  onDelete={deleteExpense}
                />
              ))}
            </div>
          )}

          {/* Category totals */}
          {props.expenses.length > 0 && (
            <div className="flex gap-4 mt-3 p-2 bg-gray-100 rounded text-xs">
              <div>
                <span className="text-gray-500">Essential: </span>
                <span className="font-medium text-amber-700">{formatCurrency(summary.essentialExpensesTotal)}/mo</span>
              </div>
              <div>
                <span className="text-gray-500">Nice-to-have: </span>
                <span className="font-medium text-indigo-700">{formatCurrency(summary.niceToHaveExpensesTotal)}/mo</span>
              </div>
              <div>
                <span className="text-gray-500">Savings: </span>
                <span className="font-medium text-emerald-600">{formatCurrency(summary.totalMonthlySavings)}/mo</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Summary & Projections */}
      <div>
        {/* Summary Dashboard */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h2 className={sectionHeaderCls}>Monthly Summary</h2>

          <div className="flex gap-3 mb-4">
            <SummaryCard
              title="Joint Account"
              income={summary.jointIncome}
              expenses={summary.jointExpenses + summary.jointMortgage}
              savings={summary.jointSavings}
              balance={summary.jointBalance}
              colorCls="text-blue-600"
              borderCls="border-blue-600"
            />
            <SummaryCard
              title="You"
              income={summary.partner1Remaining}
              expenses={summary.partner1Expenses}
              savings={summary.partner1Savings}
              balance={summary.partner1Balance}
              colorCls="text-violet-600"
              borderCls="border-violet-600"
            />
            <SummaryCard
              title="Partner"
              income={summary.partner2Remaining}
              expenses={summary.partner2Expenses}
              savings={summary.partner2Savings}
              balance={summary.partner2Balance}
              colorCls="text-emerald-600"
              borderCls="border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-100 p-3 rounded-md text-center">
              <div className="text-xs text-green-800">Total Monthly Savings</div>
              <div className="text-2xl font-bold text-green-800">
                {formatCurrency(summary.totalMonthlySavings)}
              </div>
              <div className="text-[11px] text-gray-500">
                {formatCurrency(summary.totalAnnualSavings)}/year
              </div>
            </div>
            <div
              className={`p-3 rounded-md text-center ${
                summary.totalMonthlyLeftover >= 0 ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div className={`text-xs ${summary.totalMonthlyLeftover >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                Total Leftover
              </div>
              <div
                className={`text-2xl font-bold ${
                  summary.totalMonthlyLeftover >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(summary.totalMonthlyLeftover)}
              </div>
              <div className="text-[11px] text-gray-500">
                {summary.totalMonthlyLeftover > 0 ? 'Consider allocating to savings' : 'Over budget!'}
              </div>
            </div>
          </div>
        </div>

        {/* Projections Section */}
        <div className={sectionCls}>
          <h2 className={sectionHeaderCls}>Savings Projections</h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={`${labelCls} text-xs`}>
                Projection Period: {props.projectionYears} year{props.projectionYears > 1 ? 's' : ''}
              </label>
              <input
                type="range"
                min={constants.minBudgetProjectionYears}
                max={constants.maxBudgetProjectionYears}
                value={props.projectionYears}
                onChange={(e) => props.setProjectionYears(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className={`${labelCls} text-xs`}>Savings Growth Rate (%)</label>
              <input
                type="number"
                value={props.savingsGrowthRate}
                onChange={(e) => props.setSavingsGrowthRate(safeNumber(e.target.value, 0))}
                className={inputCls}
                step="0.5"
                min="0"
                max="15"
              />
            </div>
          </div>

          {summary.totalMonthlySavings === 0 ? (
            <div className="text-center p-6 text-gray-500 bg-white rounded-md border border-dashed border-gray-300">
              Add savings items to see projections
            </div>
          ) : (
            <div className="bg-white rounded-lg overflow-hidden">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2.5 text-left">Year</th>
                    <th className="p-2.5 text-right">Contributed</th>
                    <th className="p-2.5 text-right">Growth</th>
                    <th className="p-2.5 text-right">Total Pot</th>
                    <th className="p-2.5 text-right">Mortgage</th>
                    <th className="p-2.5 text-right">Net Worth</th>
                  </tr>
                </thead>
                <tbody>
                  {projections.map((p) => (
                    <tr key={p.year} className="border-b border-gray-200">
                      <td className="p-2.5">Year {p.year}</td>
                      <td className="p-2.5 text-right">{formatCurrency(p.savingsContributed)}</td>
                      <td className="p-2.5 text-right text-emerald-600">+{formatCurrency(p.savingsGrowth)}</td>
                      <td className="p-2.5 text-right font-medium text-emerald-600">
                        {formatCurrency(p.savingsPotTotal)}
                      </td>
                      <td className="p-2.5 text-right text-red-600">
                        {formatCurrency(p.mortgagePrincipalRemaining)}
                      </td>
                      <td
                        className={`p-2.5 text-right font-bold ${
                          p.netWorth >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(p.netWorth)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {lastProjection && (
            <div
              className={`mt-3 p-3 rounded-md text-center ${
                lastProjection.netWorth >= 0 ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div className="text-xs text-gray-500">
                Net Worth after {props.projectionYears} year{props.projectionYears > 1 ? 's' : ''}
              </div>
              <div
                className={`text-[28px] font-bold ${
                  lastProjection.netWorth >= 0 ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {formatCurrency(lastProjection.netWorth)}
              </div>
              <div className="text-[11px] text-gray-500">
                Savings: {formatCurrency(lastProjection.savingsPotTotal)} - Mortgage:{' '}
                {formatCurrency(lastProjection.mortgagePrincipalRemaining)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BudgetingTab;
