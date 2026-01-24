// National Insurance Rates for 2025/26

export interface NIBand {
  min: number;
  max: number | null;
  rate: number; // percentage
}

export const nationalInsuranceBands: NIBand[] = [
  { min: 0, max: 12570, rate: 0 }, // Below threshold
  { min: 12570, max: 50270, rate: 8 }, // Standard rate
  { min: 50270, max: null, rate: 2 }, // Upper earnings limit
];
