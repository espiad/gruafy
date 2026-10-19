'use client';

import { useActionState, useEffect, useState } from 'react';
import { rushSaveTicketUrl } from '@/features/rush/actions';

/**
 * Link de la preventa. A propósito NO queda a mano: vive en "Ajustes" (plegado) y,
 * aun abierto, se muestra en modo lectura. Para cambiarlo hay que tocar "Cambiar
 * link", así no se edita por error.
 */
export function TicketUrlForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(rushSaveTicketUrl, null);
  const [editando, setEditando] = useState(false);

  // Al guardar bien, volvemos al modo lectura.
  useEffect(() => {
    if (state?.ok) setEditando(false);
  }, [state]);

  return (
    <details className="group rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-zinc-400 hover:text-zinc-200 sm:px-5">
        <span>Ajustes</span>
        <span className="text-xs transition-transform group-open:rotate-180">▾</span>
      </summary>

      <div className="border-t border-zinc-800 px-4 py-4 sm:px-5">
        <p className="text-sm font-medium">Link de la preventa</p>
        <p className="mt-1 text-xs text-zinc-500">
          A dónde lleva el botón &ldquo;Entrar a la preventa&rdquo;. Vacío = el botón avisa que todavía no
          está disponible. El cambio rige al instante.
        </p>

        {!editando ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm">
              {current ? (
                <a href={current} target="_blank" rel="noopener noreferrer" className="text-zinc-300 underline underline-offset-2">
                  {current}
                </a>
              ) : (
                <span className="text-zinc-500">Sin link cargado</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
            >
              Cambiar link
            </button>
          </div>
        ) : (
          <form action={action} className="mt-3 space-y-2">
            <input
              type="url"
              name="ticket_url"
              defaultValue={current}
              autoFocus
              placeholder="https://ticketera.com/evento"
              aria-label="URL de la ticketera"
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="h-10 rounded-xl bg-zinc-100 px-5 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {pending ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="h-10 rounded-xl px-4 text-sm text-zinc-400 hover:text-zinc-200"
              >
                Cancelar
              </button>
            </div>
            {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
          </form>
        )}
        {state?.ok && !editando && <p className="mt-2 text-xs text-emerald-400">Guardado.</p>}
      </div>
    </details>
  );
}
