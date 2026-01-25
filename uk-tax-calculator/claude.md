# UK Tax Calculator

## Project Overview
A React + TypeScript web application for calculating UK taxes, benefits, and financial projections for the 2025/26 tax year. Supports scenario comparison to help users optimize their financial decisions.

## Tech Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Inline styles (no CSS framework)
- **Linting**: ESLint with TypeScript support

## Project Structure

```
uk-tax-calculator/
├── src/
│   ├── App.tsx              # Main UI component with all form inputs and results display
│   ├── main.tsx             # React entry point
│   ├── data/                # Tax rates and thresholds
│   │   ├── taxRates2025.ts      # Income tax bands (Scotland & England)
│   │   ├── niRates2025.ts       # National Insurance rates
│   │   ├── benefitsThresholds2025.ts  # Child benefit, Tax-Free Childcare thresholds
│   │   ├── lbttRates2025.ts     # Scottish Land & Buildings Transaction Tax
│   │   └── constants.ts         # Shared constants
│   ├── lib/
│   │   ├── calculator/          # All calculation logic
│   │   │   ├── index.ts         # Main orchestrator (calculateAllResults)
│   │   │   ├── incomeTax.ts     # Income tax calculation
│   │   │   ├── nationalInsurance.ts  # NI calculation
│   │   │   ├── pension.ts       # Pension contributions & projections
│   │   │   ├── benefits.ts      # Child benefit, Tax-Free Childcare, ANI
│   │   │   ├── companyCard.ts   # BIK calculations
│   │   │   ├── housePurchase.ts # House affordability analysis
│   │   │   ├── lbtt.ts          # Scottish property tax
│   │   │   ├── stampDuty.ts     # English property tax
│   │   │   └── mortgageRepayment.ts  # Mortgage calculations
│   │   └── utils/
│   │       ├── formatters.ts    # Currency formatting
│   │       ├── compoundGrowth.ts  # Pension growth calculations
│   │       └── validation.ts    # Input validation
│   └── types/
│       ├── scenario.ts          # Core type definitions
│       └── settings.ts          # Settings types
├── index.html
├── vite.config.ts
└── package.json
```

## Key Concepts

### Adjusted Net Income (ANI)
Critical for benefits calculations. Formula:
```
ANI = Gross Salary - Employee Pension - Car Salary Sacrifice + BIK Value
```

Key thresholds:
- **£60,000-£80,000**: Child Benefit taper zone (1% charge per £200 over £60k)
- **£100,000**: Loss of Tax-Free Childcare (£2k/child), Personal Allowance taper begins

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
```
