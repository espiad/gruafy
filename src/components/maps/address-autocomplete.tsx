'use client';

import { useEffect, useRef, useState } from 'react';
import { autocomplete, type GeoPoint } from '@/lib/geoapify';

interface Props {
  label: string;
  placeholder?: string;
  onSelect: (point: GeoPoint) => void;
}

/** Input con autocompletado de direcciones (Geoapify), sesgado a AMBA. */
export function AddressAutocomplete({ label, placeholder, onSelect }: Props) {
  const [value, setValue] = useState('');
  const [results, setResults] = useState<GeoPoint[]>([]);
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (value.trim().length < 3) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const r = await autocomplete(value, ctrl.signal);
        setResults(r);
        setOpen(true);
      } catch {
        /* búsqueda cancelada */
      }
    }, 280);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="relative">
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        className="focus-ring h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lng}-${i}`}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setValue(r.address);
                  setOpen(false);
                  onSelect(r);
                }}
              >
                {r.address}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
