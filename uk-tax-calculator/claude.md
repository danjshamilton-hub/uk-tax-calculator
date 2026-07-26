# UK Tax Calculator

## Project Overview
A React + TypeScript web application for calculating UK taxes, benefits, and financial projections. Defaults to the 2026/27 tax year, with rates held per year so that calculations spanning a tax year boundary (parental leave especially) use the right ones. Supports scenario comparison to help users optimize their financial decisions.

## Tech Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (utility classes in JSX)
- **Linting**: ESLint with TypeScript support
- **Testing**: Vitest (`npm test`)

## Project Structure

```
uk-tax-calculator/
├── src/
│   ├── App.tsx              # Main UI component with all form inputs and results display
│   ├── main.tsx             # React entry point
│   ├── data/                # Tax rates and thresholds
│   │   ├── taxYears/            # Per-tax-year rate registry
│   │   │   ├── index.ts         # getRatesForTaxYear, DEFAULT_TAX_YEAR, accessors
│   │   │   ├── types.ts         # TaxYearRates and friends
│   │   │   ├── year2025.ts      # 2025/26 rates
│   │   │   └── year2026.ts      # 2026/27 rates
│   │   ├── lbttRates2025.ts     # Scottish Land & Buildings Transaction Tax
│   │   └── constants.ts         # Shared constants
│   ├── lib/
│   │   ├── calculator/          # All calculation logic
│   │   │   ├── index.ts         # Main orchestrator (calculateAllResults)
│   │   │   ├── incomeTax.ts     # Income tax calculation
│   │   │   ├── nationalInsurance.ts  # NI calculation
│   │   │   ├── pension.ts       # Pension contributions & projections
│   │   │   ├── benefits.ts      # Child benefit, Tax-Free Childcare, ANI
│   │   │   ├── maternityPay.ts  # Parental leave: weekly schedule -> tax years
│   │   │   ├── companyCard.ts   # BIK calculations
│   │   │   ├── housePurchase.ts # House affordability analysis
│   │   │   ├── lbtt.ts          # Scottish property tax
│   │   │   ├── stampDuty.ts     # English property tax
│   │   │   └── mortgageRepayment.ts  # Mortgage calculations
│   │   └── utils/
│   │       ├── formatters.ts    # Currency formatting
│   │       └── compoundGrowth.ts  # Pension growth calculations
│   └── types/
│       ├── scenario.ts          # Core type definitions
│       ├── maternity.ts         # Parental leave types
│       ├── appState.ts          # Persisted UI state shapes + DEFAULT_* values
│       └── settings.ts          # Settings types
├── index.html
├── vite.config.ts
└── package.json
```

## Key Concepts

### Tax years
Rates live in `src/data/taxYears/`, keyed by the tax year's start year (2026 means
2026/27). `getRatesForTaxYear(year)` returns income tax bands for both regions, NI bands,
the Lower Earnings Limit, student loan plans, benefits thresholds and statutory parental
pay rates. Years that have not been announced are carried forward from the latest known
year with `isProjected: true`, and the UI labels any figure drawn from them.

Every calculator function takes an optional trailing `taxYear` that defaults to
`DEFAULT_TAX_YEAR`, so call sites that do not care about the year are unaffected.

### Adjusted Net Income (ANI)
Critical for benefits calculations. Formula:
```
ANI = Gross Salary - Employee Pension - Car Salary Sacrifice + BIK Value
```

Key thresholds:
- **£60,000-£80,000**: Child Benefit taper zone (1% charge per £200 over £60k)
- **£100,000**: Loss of Tax-Free Childcare (£2k/child), Personal Allowance taper begins

### Parental Leave
The Maternity & Paternity tab (`src/lib/calculator/maternityPay.ts`) models a couple's
leave a week at a time from the birth date, then aggregates into PAYE tax months and tax
years. Three things drive the design:

- **Leave and pay are separate pots.** Maternity leave runs to 52 weeks but only 39 are
  paid. Curtailing it releases up to 50 shared leave weeks and up to 37 shared pay weeks
  (the birth parent cannot give up 2 compulsory weeks of either). Shared Parental Leave
  taken beyond the pay pot is unpaid. Statutory paternity leave sits on top of both.
- **NI and student loan are per pay period; income tax is cumulative.** Annualising a year
  containing months of statutory-only pay understates NI, so those are computed month by
  month and passed to `calculateAllResults` via the `nationalInsuranceOverride` /
  `studentLoanOverride` inputs. Income tax uses the cumulative PAYE basis, which produces
  the refunds that show up on a real payslip when pay drops mid-year.
- **Benefits are assessed on the household, not per person.** The High Income Child Benefit
  Charge falls on whichever parent has the higher ANI; Tax-Free Childcare requires *both*
  parents at or below £100,000. Leave can pull a parent back under a threshold, which is
  usually the most interesting result on the tab.

Employer schemes are inclusive of statutory pay: each week pays the higher of the two
rather than stacking. Salary is spread over the actual length of each tax year, so a full
working year sums to exactly the annual salary in leap years too.

### Scenario Comparison
The app supports comparing two scenarios (A and B) with different:
- Gross salaries
- Pension contribution percentages
- Company car configurations (separate for each scenario)
- Child benefit claiming decisions (per scenario)
- Tax-Free Childcare usage (per scenario)

### Tax Regions
- **Scotland**: Uses Scottish Income Tax bands (Starter, Basic, Intermediate, Higher, Advanced, Top)
- **England**: Uses UK Income Tax bands (Basic, Higher, Additional)

### Company Car (Salary Sacrifice)
- Reduces taxable income via salary sacrifice
- Adds Benefit-in-Kind (BIK) tax based on P11D value and BIK rate
- Each scenario can have different car configurations

## Calculation Order (in calculateAllResults)
1. Start with gross salary
2. Calculate employee pension (on full gross BEFORE car sacrifice)
3. Calculate employer pension
4. Apply car salary sacrifice
5. Calculate gross after deductions
6. Calculate BIK taxable amount
7. Calculate taxable income (gross after deductions + BIK)
8. Calculate income tax
9. Calculate National Insurance (on gross after deductions, NOT including BIK)
10. Calculate BIK tax using marginal rate
11. Calculate Adjusted Net Income
12. Calculate benefits impacts (child benefit charge, tax-free childcare loss)
13. Calculate take-home pay
14. Calculate pension projections
15. Calculate mortgage affordability
16. Analyze house purchase (if inputs provided)

## Common Tasks

### Adding a new tax threshold
1. Update the relevant file in `src/data/`
2. Update calculation logic in `src/lib/calculator/`

### Adding a new scenario input
1. Add state in `App.tsx`
2. Add to `ScenarioInputs` type in `src/types/scenario.ts`
3. Add to scenario building logic in `App.tsx`
4. Update `calculateAllResults` in `src/lib/calculator/index.ts`
5. Add UI inputs

### Adding a new result field
1. Add to `CalculationResults` type in `src/types/scenario.ts`
2. Calculate in `calculateAllResults`
3. Display in results section of `App.tsx`

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Test
npm test
```

### Adding a new tax year
1. Add `src/data/taxYears/yearNNNN.ts` following the shape of `year2026.ts`
2. Register it in the `taxYears` map in `src/data/taxYears/index.ts`
3. Bump `DEFAULT_TAX_YEAR` if it should become the default
4. Add its published figures to `src/data/taxYears/taxYears.test.ts`
