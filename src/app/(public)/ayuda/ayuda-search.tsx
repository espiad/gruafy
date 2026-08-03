'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { SupportArticle } from '@/features/support/articles';

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'client', label: 'Clientes' },
  { key: 'provider', label: 'Grúas' },
] as const;

export function AyudaSearch({ articles }: { articles: SupportArticle[] }) {
  const [q, setQ] = useState('');
  const [role, setRole] = useState<(typeof FILTERS)[number]['key']>('all');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return articles.filter((a) => {
      const matchRole = role === 'all' || a.target_role === role || a.target_role === 'all';
      const matchTerm =
        !term || a.title.toLowerCase().includes(term) || a.content.toLowerCase().includes(term);
      return matchRole && matchTerm;
    });
  }, [articles, q, role]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en la ayuda…"
          className="focus-ring h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setRole(f.key)}
              className={`focus-ring h-11 rounded-md border px-4 text-sm font-medium ${
                role === f.key
                  ? 'border-brand-orange bg-brand-orange/15 text-brand-green'
                  : 'border-input hover:bg-accent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {filtered.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/ayuda/${a.slug}`}
              className="focus-ring block h-full rounded-xl border border-border bg-card p-5 hover:border-brand-orange"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
                {a.category}
              </span>
              <h3 className="mt-1 font-semibold">{a.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.content}</p>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            No encontramos artículos para esa búsqueda. Probá con otras palabras.
          </li>
        )}
      </ul>
    </div>
  );
}
