// UK Tax Rates for 2025/26 Tax Year

export interface TaxBand {
  min: number;
  max: number | null; // null for highest band
  rate: number; // percentage
}

export interface TaxConfig {
  personalAllowance: number;
  personalAllowanceTaperStart: number;
  personalAllowanceTaperEnd: number;
  bands: TaxBand[];
}

// England & Wales Tax Rates
export const englandTaxConfig: TaxConfig = {
  personalAllowance: 12570,
  personalAllowanceTaperStart: 100000,
  personalAllowanceTaperEnd: 125140,
  bands: [
    { min: 0, max: 12570, rate: 0 }, // Personal allowance
    { min: 12571, max: 50270, rate: 20 }, // Basic rate
    { min: 50271, max: 125140, rate: 40 }, // Higher rate
    { min: 125140, max: null, rate: 45 }, // Additional rate
  ],
};

// Scotland Tax Rates
export const scotlandTaxConfig: TaxConfig = {
  personalAllowance: 12570,
  personalAllowanceTaperStart: 100000,
  personalAllowanceTaperEnd: 125140,
  bands: [
    { min: 0, max: 12570, rate: 0 }, // Personal allowance
    { min: 12571, max: 15397, rate: 19 }, // Starter rate
    { min: 15398, max: 27491, rate: 20 }, // Basic rate
    { min: 27492, max: 43662, rate: 21 }, // Intermediate rate
    { min: 43663, max: 75000, rate: 42 }, // Higher rate
    { min: 75001, max: 125140, rate: 45 }, // Advanced rate
    { min: 125140, max: null, rate: 48 }, // Top rate
  ],
};

export type TaxRegion = 'england' | 'scotland';

export function getTaxConfig(region: TaxRegion): TaxConfig {
  return region === 'scotland' ? scotlandTaxConfig : englandTaxConfig;
}
