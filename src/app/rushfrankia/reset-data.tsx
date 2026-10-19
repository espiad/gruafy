'use client';

import { useState, useTransition } from 'react';
import { rushResetData } from '@/features/rush/actions';

/**
 * Borra todas las visitas y clics para arrancar de cero (útil mientras se prueba).
 * Pide confirmación en dos pasos porque no se puede deshacer.
 */
export function ResetData() {
  const [confirmar, setConfirmar] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);

  function eliminar() {
    start(async () => {
      const res = await rushResetData();
      setMsg(res);
      if (res.ok) setConfirmar(false);
    });
  }

  return (
    <div>
      <p className="text-sm font-medium">Eliminar datos</p>
      <p className="mt-1 text-xs text-zinc-500">
        Borra todas las visitas y clics registrados, para empezar de cero. El link de la preventa se
        mantiene. No se puede deshacer.
      </p>

      {!confirmar ? (
        <button
          type="button"
          onClick={() => {
            setMsg(null);
            setConfirmar(true);
          }}
          className="mt-3 rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-400 hover:border-red-700 hover:text-red-300"
        >
          Eliminar datos
        </button>
      ) : (
        <div className="mt-3 rounded-xl border border-red-900/60 bg-red-950/30 p-3">
          <p className="text-xs text-red-300">¿Seguro? Se van a borrar todas las estadísticas.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={eliminar}
              disabled={pending}
              className="h-9 rounded-lg bg-red-500 px-4 text-xs font-semibold text-white hover:bg-red-400 disabled:opacity-50"
            >
              {pending ? 'Eliminando…' : 'Sí, eliminar todo'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmar(false)}
              disabled={pending}
              className="h-9 rounded-lg px-3 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {msg?.ok && <p className="mt-2 text-xs text-emerald-400">Listo, las estadísticas quedaron en cero.</p>}
      {msg?.error && <p className="mt-2 text-xs text-red-400">{msg.error}</p>}
    </div>
  );
}
