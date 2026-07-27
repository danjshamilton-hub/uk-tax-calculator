import { useState, type ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  /** Shown next to the title, e.g. a salary summary, when collapsed or open */
  summary?: ReactNode;
  defaultOpen?: boolean;
  /** Blue accent, used to mark Scenario B sections */
  accent?: boolean;
  /** Optional control rendered in the header, e.g. an enable checkbox */
  headerControl?: ReactNode;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  accent = false,
  headerControl,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`rounded-lg mb-4 border ${
        accent ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 flex-1 text-left cursor-pointer"
        >
          <span
            className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-90' : ''}`}
            aria-hidden="true"
          >
            ▶
          </span>
          <span className={`text-base font-semibold ${accent ? 'text-blue-700' : ''}`}>
            {title}
          </span>
          {summary && <span className="text-[13px] text-gray-500 font-normal">{summary}</span>}
        </button>
        {headerControl}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
