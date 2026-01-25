// Global application settings

export interface GlobalSettings {
  investmentReturnRate: number; // Annual percentage for pension projections
  mortgageMultiplier: number; // e.g., 4.5
  monthlyAffordabilityThreshold: number; // e.g., 0.30 for 30%
}

export const defaultSettings: GlobalSettings = {
  investmentReturnRate: 5.0,
  mortgageMultiplier: 4.5,
  monthlyAffordabilityThreshold: 0.30,
};
