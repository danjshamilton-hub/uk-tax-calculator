// Company Car BIK (Benefit in Kind) Rate Schedules
// Based on UK Government published rates

/**
 * EV (Zero Emission) BIK rates by tax year
 * Source: UK Government published schedule
 */
export const evBikRateSchedule: Record<number, number> = {
  2024: 2, // 2024/25
  2025: 2, // 2025/26
  2026: 3, // 2026/27
  2027: 4, // 2027/28
  2028: 5, // 2028/29
  2029: 6, // 2029/30
  2030: 7, // 2030/31
  2031: 8, // 2031/32
  2032: 9, // 2032/33
  2033: 10, // 2033/34
  2034: 10, // 2034/35 (assumed cap)
};

/**
 * Plug-in Hybrid (PHEV) BIK rates by tax year
 * Rates depend on electric range - using typical high-range values (40+ miles)
 */
export const hybridBikRateSchedule: Record<number, number> = {
  2024: 5,
  2025: 5,
  2026: 6,
  2027: 7,
  2028: 8,
  2029: 9,
  2030: 10,
  2031: 11,
  2032: 12,
  2033: 13,
  2034: 14,
};

/**
 * Default BIK rate for petrol/diesel vehicles
 * Actual rate depends on CO2 emissions, using 37% as maximum
 */
export const defaultPetrolDieselRate = 37;

export type CarType = 'ev' | 'hybrid' | 'petrol' | 'diesel';

/**
 * Get the BIK rate for a given tax year and car type
 * @param taxYear - The tax year (e.g., 2025 for 2025/26)
 * @param carType - The type of vehicle
 * @param customRate - Optional custom rate override
 */
export function getBikRate(
  taxYear: number,
  carType: CarType,
  customRate?: number
): number {
  // If custom rate provided, use it
  if (customRate !== undefined) {
    return customRate;
  }

  switch (carType) {
    case 'ev':
      // Use schedule, or last known rate for years beyond schedule
      return evBikRateSchedule[taxYear] ?? evBikRateSchedule[2034] ?? 10;
    case 'hybrid':
      return hybridBikRateSchedule[taxYear] ?? hybridBikRateSchedule[2034] ?? 14;
    case 'petrol':
    case 'diesel':
      return defaultPetrolDieselRate;
    default:
      return 2;
  }
}

/**
 * Get all available tax years from the EV schedule
 */
export function getAvailableTaxYears(): number[] {
  return Object.keys(evBikRateSchedule).map(Number).sort();
}

/**
 * Get BIK rate schedule for display purposes
 */
export function getBikRateSchedule(carType: CarType): Array<{ year: number; rate: number }> {
  const years = getAvailableTaxYears();
  return years.map((year) => ({
    year,
    rate: getBikRate(year, carType),
  }));
}

/**
 * Tax year month names (April = month 1 of tax year)
 */
export const taxYearMonths = [
  { value: 1, label: 'April', calendarMonth: 4 },
  { value: 2, label: 'May', calendarMonth: 5 },
  { value: 3, label: 'June', calendarMonth: 6 },
  { value: 4, label: 'July', calendarMonth: 7 },
  { value: 5, label: 'August', calendarMonth: 8 },
  { value: 6, label: 'September', calendarMonth: 9 },
  { value: 7, label: 'October', calendarMonth: 10 },
  { value: 8, label: 'November', calendarMonth: 11 },
  { value: 9, label: 'December', calendarMonth: 12 },
  { value: 10, label: 'January', calendarMonth: 1 },
  { value: 11, label: 'February', calendarMonth: 2 },
  { value: 12, label: 'March', calendarMonth: 3 },
];

// Re-exported for the existing call sites; the canonical definition lives with
// the tax year registry.
export { formatTaxYear } from './taxYears';
