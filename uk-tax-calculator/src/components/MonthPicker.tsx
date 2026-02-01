// MonthPicker component for selecting tax year months
// Tax year runs April to March, so month 1 = April, month 12 = March

import { taxYearMonths } from '../data/bikRates';

interface MonthPickerProps {
  label: string;
  value: number;
  onChange: (month: number) => void;
  style?: React.CSSProperties;
}

export function MonthPicker({ label, value, onChange, style }: MonthPickerProps) {
  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    ...style,
  };

  return (
    <div style={{ marginBottom: '8px' }}>
      <label
        style={{
          display: 'block',
          marginBottom: '4px',
          fontWeight: 500,
          color: '#374151',
          fontSize: '14px',
        }}
      >
        {label}
      </label>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} style={selectStyle}>
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
