// Simplified inline calculator for testing
export function simpleCalculate(grossSalary: number) {
  const pension = grossSalary * 0.05;
  const taxableIncome = grossSalary - pension;

  // Simple Scotland tax
  let tax = 0;
  if (taxableIncome > 12570) {
    const basic = Math.min(taxableIncome - 12570, 14876 - 12570);
    tax += basic * 0.19;

    if (taxableIncome > 14876) {
      const remaining = Math.min(taxableIncome - 14876, 50270 - 14876);
      tax += remaining * 0.20;
    }
  }

  // Simple NI
  let ni = 0;
  if (taxableIncome > 12570) {
    ni = (Math.min(taxableIncome, 50270) - 12570) * 0.08;
  }

  const takeHome = grossSalary - pension - tax - ni;

  return {
    gross: grossSalary,
    pension,
    tax: Math.round(tax),
    ni: Math.round(ni),
    takeHome: Math.round(takeHome)
  };
}
