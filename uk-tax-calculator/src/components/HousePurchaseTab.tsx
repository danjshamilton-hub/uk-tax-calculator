import type { CalculationResults } from '../types/scenario';
import type { TaxRegion } from '../data/taxYears';
import type { HouseState } from '../types/appState';
import { formatCurrency, safeNumber } from '../lib/utils/formatters';
import { constants } from '../data/constants';

interface HousePurchaseTabProps {
  house: HouseState;
  setHouse: (s: HouseState | ((prev: HouseState) => HouseState)) => void;
  grossSalary: number;
  adjustedAnnual: number;
  taxRegion: TaxRegion;
  setTaxRegion: (r: TaxRegion) => void;
  resultA: CalculationResults;
  /** Partner 2's gross salary from the Salary tab, 0 when not included */
  partnerGrossSalary: number;
  partnerIncluded: boolean;
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm box-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelCls = 'block mb-1 font-medium text-gray-700 text-sm';
const fieldCls = 'mb-3';
const sectionCls = 'bg-gray-50 p-4 rounded-lg mb-4';
const sectionHeaderCls = 'flex items-center gap-2 mb-3 text-base font-semibold';

export function HousePurchaseTab({
  house, setHouse,
  grossSalary, adjustedAnnual, taxRegion, setTaxRegion,
  resultA,
  partnerGrossSalary, partnerIncluded,
}: HousePurchaseTabProps) {
  const update = (updates: Partial<HouseState>) => setHouse(prev => ({ ...prev, ...updates }));
  const hp = resultA.housePurchase;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[400px_1fr] gap-6">
      {/* Inputs */}
      <div>
        {/* Income Summary */}
        <div className={`${sectionCls} !bg-blue-50`}>
          <h2 className={sectionHeaderCls}>Income Summary</h2>
          <div className="flex justify-between mb-2">
            <span>Your Annual Take-Home:</span>
            <span className="font-bold text-emerald-600">{formatCurrency(adjustedAnnual)}</span>
          </div>
          <div className="text-xs text-gray-500">Based on {formatCurrency(grossSalary)} gross salary</div>
        </div>

        {/* Partner Income */}
        <div className={sectionCls}>
          <h2 className={sectionHeaderCls}>Partner Income</h2>
          {partnerIncluded ? (
            <div className="bg-white p-3 rounded-md mb-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Partner 2 gross salary</span>
                <span className="font-medium">{formatCurrency(partnerGrossSalary)}</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-2">
                From the Salary tab, including their pension, car and student loan.
              </div>
            </div>
          ) : (
            <div className="text-[13px] text-gray-500 mb-2">
              No second earner. Add Partner 2 on the Salary tab to include their income here.
            </div>
          )}
          {partnerIncluded && hp && (
            <div className="bg-green-50 p-3 rounded-md mt-2">
              <div className="flex justify-between mb-1">
                <span>Partner take-home:</span>
                <span className="font-bold">{formatCurrency(hp.partnerAnnualTakeHome)}</span>
              </div>
              <div className="flex justify-between font-bold text-green-800">
                <span>Combined take-home:</span>
                <span>{formatCurrency(hp.combinedAnnualTakeHome)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className={sectionCls}>
          <h2 className={sectionHeaderCls}>Property Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className={fieldCls}>
              <label className={labelCls}>Purchase Price</label>
              <input type="number" value={house.purchasePrice} onChange={e => update({ purchasePrice: safeNumber(e.target.value) })} className={inputCls} />
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Valuation</label>
              <input type="number" value={house.houseValuation} onChange={e => update({ houseValuation: safeNumber(e.target.value) })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={fieldCls}>
              <label className={labelCls}>Deposit (%)</label>
              <input type="number" value={house.depositPercentage} onChange={e => update({ depositPercentage: safeNumber(e.target.value, 10) })} className={inputCls} min="5" max="100" />
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Tax Region</label>
              <select value={taxRegion} onChange={e => setTaxRegion(e.target.value as TaxRegion)} className={inputCls}>
                <option value="scotland">Scotland (LBTT)</option>
                <option value="england">England (Stamp Duty)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cash Position */}
        <div className={sectionCls}>
          <h2 className={sectionHeaderCls}>Cash Position</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className={fieldCls}>
              <label className={labelCls}>Current Savings</label>
              <input type="number" value={house.currentBalance} onChange={e => update({ currentBalance: safeNumber(e.target.value) })} className={inputCls} />
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Moving Costs</label>
              <input type="number" value={house.movingCosts} onChange={e => update({ movingCosts: safeNumber(e.target.value) })} className={inputCls} />
            </div>
          </div>
          <div className="border-t border-gray-200 pt-3 mt-2">
            <div className="text-[13px] text-gray-500 mb-2">Current Property (if selling)</div>
            <div className="grid grid-cols-2 gap-3">
              <div className={fieldCls}>
                <label className={labelCls}>Sale Price</label>
                <input type="number" value={house.currentHouseSalePrice} onChange={e => update({ currentHouseSalePrice: safeNumber(e.target.value) })} className={inputCls} />
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>Remaining Mortgage</label>
                <input type="number" value={house.currentHouseMortgage} onChange={e => update({ currentHouseMortgage: safeNumber(e.target.value) })} className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* Mortgage Terms */}
        <div className={sectionCls}>
          <h2 className={sectionHeaderCls}>Mortgage Terms</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className={fieldCls}>
              <label className={labelCls}>Interest Rate (%)</label>
              <input type="number" value={house.mortgageInterestRate} onChange={e => update({ mortgageInterestRate: safeNumber(e.target.value, 4.5) })} className={inputCls} step="0.1" />
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Term (years)</label>
              <input type="number" value={house.mortgageTerm} onChange={e => update({ mortgageTerm: safeNumber(e.target.value, 25) })} className={inputCls} min="5" max="40" />
            </div>
          </div>
        </div>

        {/* Mortgage Capacity Options */}
        <div className={sectionCls}>
          <h2 className={sectionHeaderCls}>Mortgage Capacity Options</h2>
          <div className={fieldCls}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={house.useGrossForMortgage} onChange={e => update({ useGrossForMortgage: e.target.checked })} className="w-[18px] h-[18px]" />
              <span className="text-sm">Use gross income for 4.5x calculation</span>
            </label>
            <div className="text-xs text-gray-500 mt-1 ml-[26px]">
              {house.useGrossForMortgage
                ? `Using combined gross: ${formatCurrency(grossSalary + partnerGrossSalary)}`
                : 'Default: uses combined annual take-home pay'}
            </div>
          </div>
          <div className={`${fieldCls} mt-3`}>
            <label className={labelCls}>Override Max Mortgage</label>
            <input
              type="number"
              value={house.mortgageMaxOverride || ''}
              onChange={e => update({ mortgageMaxOverride: safeNumber(e.target.value) })}
              className={inputCls}
              placeholder="Leave empty to use calculated amount"
              min="0"
              step="10000"
            />
            <div className="text-xs text-gray-500 mt-1">
              {house.mortgageMaxOverride > 0
                ? `Using override: ${formatCurrency(house.mortgageMaxOverride)}`
                : 'Enter a value to override the 4.5x calculation'}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        {hp ? (
          <>
            {/* Affordability Summary */}
            <div className={`p-5 rounded-lg ${hp.canAfford ? 'bg-green-50' : 'bg-red-50'}`}>
              <h2 className={`mb-4 text-lg font-semibold ${hp.canAfford ? 'text-green-800' : 'text-red-800'}`}>
                {hp.canAfford ? '\u2713 Affordable' : '\u2717 Not Affordable'}
              </h2>
              {hp.affordabilityIssues.length > 0 && (
                <ul className="m-0 mb-4 pl-5 text-sm text-red-800">
                  {hp.affordabilityIssues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Mortgage Analysis */}
            <div className="bg-blue-50 p-5 rounded-lg mt-4">
              <h3 className="mb-4 text-base font-semibold">Mortgage Analysis</h3>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-2">Your take-home</td>
                    <td className="text-right">{formatCurrency(hp.yourAnnualTakeHome)}</td>
                  </tr>
                  {partnerIncluded && (
                    <tr>
                      <td className="py-2">Partner take-home</td>
                      <td className="text-right">{formatCurrency(hp.partnerAnnualTakeHome)}</td>
                    </tr>
                  )}
                  <tr className="font-bold border-t border-gray-300">
                    <td className="py-2">Combined annual income</td>
                    <td className="text-right">{formatCurrency(hp.combinedAnnualTakeHome)}</td>
                  </tr>
                  <tr className="bg-blue-100">
                    <td className="py-2 font-bold">
                      Max mortgage
                      {house.mortgageMaxOverride > 0 ? ' (override)' : house.useGrossForMortgage ? ' (4.5x gross)' : ' (4.5x take-home)'}
                    </td>
                    <td className="text-right font-bold text-lg">{formatCurrency(hp.maxMortgageCapacity)}</td>
                  </tr>
                  <tr>
                    <td className="py-2">Mortgage needed</td>
                    <td className={`text-right ${hp.mortgageNeeded <= hp.maxMortgageCapacity ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(hp.mortgageNeeded)}
                      {hp.mortgageNeeded <= hp.maxMortgageCapacity ? ' \u2713' : ' \u2717'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">Monthly repayment</td>
                    <td className="text-right">{formatCurrency(hp.monthlyRepayment)}</td>
                  </tr>
                  <tr>
                    <td className="py-2">% of monthly take-home</td>
                    <td className={`text-right ${hp.isMonthlyAffordable ? 'text-emerald-600' : 'text-red-600'}`}>
                      {hp.monthlyRepaymentPercentage.toFixed(1)}%
                      {hp.isMonthlyAffordable ? ' \u2713' : ' \u2717'}
                      <span className="text-[11px] text-gray-500 ml-1">(max {constants.monthlyAffordabilityThreshold * 100}%)</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Cash Required */}
            <div className="bg-amber-100 p-5 rounded-lg mt-4">
              <h3 className="mb-4 text-base font-semibold text-amber-800">Cash Required</h3>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-1.5">Purchase price</td>
                    <td className="text-right">{formatCurrency(house.purchasePrice)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5">Less: Mortgage</td>
                    <td className="text-right text-emerald-600">-{formatCurrency(hp.mortgageNeeded)}</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="py-1.5">Cash for property</td>
                    <td className="text-right">{formatCurrency(house.purchasePrice - hp.mortgageNeeded)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5">{taxRegion === 'scotland' ? 'LBTT' : 'Stamp Duty'}</td>
                    <td className="text-right">{formatCurrency(hp.lbttOrStampDuty)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5">Moving costs</td>
                    <td className="text-right">{formatCurrency(house.movingCosts)}</td>
                  </tr>
                  <tr className="font-bold border-t border-gray-300">
                    <td className="py-2">Total required</td>
                    <td className="text-right">{formatCurrency(hp.totalCashRequired)}</td>
                  </tr>
                </tbody>
              </table>
              {(house.purchasePrice - hp.mortgageNeeded) > (house.purchasePrice * house.depositPercentage / 100) && (
                <div className="mt-3 p-2 bg-red-50 rounded text-xs text-red-800">
                  Note: Cash needed exceeds {house.depositPercentage}% deposit ({formatCurrency(house.purchasePrice * house.depositPercentage / 100)}) because mortgage is capped at your max borrowing capacity.
                </div>
              )}
            </div>

            {/* Cash Available */}
            <div className={`p-5 rounded-lg mt-4 ${hp.cashSurplusOrShortfall >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <h3 className={`mb-4 text-base font-semibold ${hp.cashSurplusOrShortfall >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                Cash Position
              </h3>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-1.5">Current savings</td>
                    <td className="text-right">{formatCurrency(house.currentBalance)}</td>
                  </tr>
                  {house.currentHouseSalePrice > 0 && (
                    <>
                      <tr>
                        <td className="py-1.5">House sale proceeds</td>
                        <td className="text-right">{formatCurrency(house.currentHouseSalePrice)}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5">Less mortgage to clear</td>
                        <td className="text-right text-red-600">-{formatCurrency(house.currentHouseMortgage)}</td>
                      </tr>
                    </>
                  )}
                  <tr className="font-bold border-t border-gray-300">
                    <td className="py-2">Total available</td>
                    <td className="text-right">{formatCurrency(hp.cashAvailable)}</td>
                  </tr>
                  <tr className={`font-bold text-lg ${hp.cashSurplusOrShortfall >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    <td className="py-3">{hp.cashSurplusOrShortfall >= 0 ? 'Surplus' : 'Shortfall'}</td>
                    <td className={`text-right ${hp.cashSurplusOrShortfall >= 0 ? 'text-green-800' : 'text-red-600'}`}>
                      {formatCurrency(Math.abs(hp.cashSurplusOrShortfall))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="bg-gray-100 p-10 rounded-lg text-center">
            <div className="text-5xl mb-4">🏠</div>
            <p className="text-gray-500">Enter property details to see affordability analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}
