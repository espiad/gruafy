'use client';

import { useActionState } from 'react';
import { rushLogin } from '@/features/rush/actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(rushLogin, null);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#0a0a0b] px-4 text-zinc-100">
      <form action={action} className="w-full max-w-xs space-y-4">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Analíticas</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">RUSH × Frankia</h1>
        </div>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="Contraseña"
          aria-label="Contraseña"
          className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Verificando…' : 'Entrar'}
        </button>
        {state?.error && <p className="text-center text-sm text-red-400">{state.error}</p>}
      </form>
    </main>
  );
}
