// MonthPicker component for selecting tax year months
// Tax year runs April to March, so month 1 = April, month 12 = March

import { taxYearMonths } from '../data/bikRates';

interface MonthPickerProps {
  label: string;
  value: number;
  onChange: (month: number) => void;
  className?: string;
}

export function MonthPicker({ label, value, onChange, className = '' }: MonthPickerProps) {
  return (
    <div className="mb-2">
      <label className="block mb-1 font-medium text-gray-700 text-sm">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${className}`}
      >
        {taxYearMonths.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default MonthPicker;
