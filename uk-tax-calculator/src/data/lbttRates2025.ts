// LBTT (Scotland) and Stamp Duty (England) Rates for 2025/26

export interface PropertyTaxBand {
  min: number;
  max: number | null;
  rate: number; // percentage
}

// Land and Buildings Transaction Tax (Scotland)
export const lbttBands: PropertyTaxBand[] = [
  { min: 0, max: 145000, rate: 0 },
  { min: 145000, max: 250000, rate: 2 },
  { min: 250000, max: 325000, rate: 5 },
  { min: 325000, max: 750000, rate: 10 },
  { min: 750000, max: null, rate: 12 },
];

// Stamp Duty Land Tax (England & Wales)
export const stampDutyBands: PropertyTaxBand[] = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250000, max: 925000, rate: 5 },
  { min: 925000, max: 1500000, rate: 10 },
  { min: 1500000, max: null, rate: 12 },
];
