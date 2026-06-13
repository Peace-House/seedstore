import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * Compact chip-style multi-input for PHCodes.
 *
 * Behaviour:
 *   - Type a code → Enter or comma adds it to the list.
 *   - Backspace on empty input removes the last chip.
 *   - Paste a comma-, space-, or newline-separated blob → all
 *     get added at once (handy when copying from a spreadsheet).
 *
 * Values are normalised on insert: trimmed + upper-cased + dedup.
 * That matches the server's `normalizePHCodeValue` (see
 * groupPurchase.controller.ts) so the chips a user sees here
 * are exactly what hits the database.
 */
interface PhCodeChipInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function PhCodeChipInput({
  value,
  onChange,
  placeholder = 'Enter PHCode and press Enter',
  disabled,
  className,
}: PhCodeChipInputProps) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const parts = raw
      .split(/[\s,;]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (parts.length === 0) return;
    const set = new Set(value);
    for (const p of parts) set.add(p);
    onChange(Array.from(set));
    setDraft('');
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded border px-2 py-1.5 bg-background ${
        className ?? ''
      }`}
    >
      {value.map((code) => (
        <span
          key={code}
          className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium"
        >
          {code}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(value.filter((c) => c !== code))}
            className="hover:bg-primary/20 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value.toUpperCase())}
        onKeyDown={onKey}
        onBlur={() => draft.trim() && commit(draft)}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData('text');
          if (/[\s,;]/.test(pasted)) {
            e.preventDefault();
            commit(pasted);
          }
        }}
        placeholder={value.length === 0 ? placeholder : ''}
        disabled={disabled}
        className="flex-1 min-w-[140px] border-0 shadow-none focus-visible:ring-0 px-1 h-7 text-sm"
      />
    </div>
  );
}
