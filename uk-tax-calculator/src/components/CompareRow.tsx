import { formatCurrency } from '../lib/utils/formatters';

interface CompareRowProps {
  label: string;
  valueA: number;
  valueB: number | null;
  compareMode: boolean;
  isDeduction?: boolean;
  isBold?: boolean;
}

export function CompareRow({ label, valueA, valueB, compareMode, isDeduction = false, isBold = false }: CompareRowProps) {
  const diff = valueB !== null ? valueB - valueA : null;
  const diffColor = diff !== null
    ? (diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-gray-500')
    : '';

  return (
    <tr className={isBold ? 'font-bold' : ''}>
      <td className="py-1.5">{label}</td>
      <td className={`text-right ${isDeduction ? 'text-red-600' : ''}`}>
        {isDeduction ? '-' : ''}{formatCurrency(Math.abs(valueA))}
      </td>
      {compareMode && valueB !== null && (
        <>
          <td className={`text-right ${isDeduction ? 'text-red-600' : ''}`}>
            {isDeduction ? '-' : ''}{formatCurrency(Math.abs(valueB))}
          </td>
          <td className={`text-right text-[13px] ${diffColor}`}>
            {diff !== null && diff !== 0 && (
              <>{diff > 0 ? '+' : ''}{formatCurrency(diff)}</>
            )}
          </td>
        </>
      )}
    </tr>
  );
}
