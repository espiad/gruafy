'use client';

import { useActionState } from 'react';
import { rushSaveTicketUrl } from '@/features/rush/actions';

/** Edición de la URL a la que lleva el botón "ENTRAR A LA PREVENTA" de la landing. */
export function TicketUrlForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(rushSaveTicketUrl, null);

  return (
    <form action={action} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
      <h2 className="text-sm font-medium">Link de la preventa</h2>
      <p className="mt-1 text-xs text-zinc-500">
        A dónde lleva el botón &ldquo;Entrar a la preventa&rdquo;. Vacío = el botón avisa que todavía no
        está disponible. Los cambios se ven en la landing en menos de un minuto.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          name="ticket_url"
          defaultValue={current}
          placeholder="https://ticketera.com/evento"
          aria-label="URL de la ticketera"
          className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 shrink-0 rounded-xl bg-zinc-100 px-5 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {state?.error && <p className="mt-2 text-xs text-red-400">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-xs text-emerald-400">Guardado.</p>}
      {current && (
        <p className="mt-2 truncate text-xs text-zinc-500">
          Actual:{' '}
          <a href={current} target="_blank" rel="noopener noreferrer" className="text-zinc-300 underline underline-offset-2">
            {current}
          </a>
        </p>
      )}
    </form>
  );
}
