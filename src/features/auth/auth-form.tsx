'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseConfig } from '@/lib/env';

type Mode = 'signin' | 'signup';

export function AuthForm({ mode, provider = false }: { mode: Mode; provider?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!hasSupabaseConfig) {
      setError('Supabase todavía no está configurado. Cargá las variables en .env.local para habilitar el acceso.');
      return;
    }

    const form = new FormData(e.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    const supabase = createClient();
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: String(form.get('first_name') ?? ''),
              last_name: String(form.get('last_name') ?? ''),
              phone: String(form.get('phone') ?? ''),
              intended_role: provider ? 'provider_owner' : 'client',
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo('Te enviamos un email para confirmar la cuenta. Revisá tu casilla.');
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // La ruta destino: onboarding de proveedor, o el panel según sesión.
      const target = provider ? '/proveedor/onboarding' : next || '/cliente';
      router.push(target);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? traducirError(err.message) : 'No pudimos completar la acción.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === 'signup' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">Nombre</Label>
            <Input id="first_name" name="first_name" required autoComplete="given-name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name">Apellido</Label>
            <Input id="last_name" name="last_name" required autoComplete="family-name" />
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="vos@email.com" />
      </div>
      {mode === 'signup' && (
        <div className="space-y-1.5">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" type="tel" required autoComplete="tel" placeholder="11 5555 5555" />
        </div>
      )}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          {mode === 'signin' && (
            <Link href="/recuperar" className="text-xs text-muted-foreground hover:text-brand-green hover:underline">
              ¿La olvidaste?
            </Link>
          )}
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          {...(mode === 'signup' ? { minLength: 8 } : {})}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          placeholder={mode === 'signup' ? 'Al menos 8 caracteres' : 'Tu contraseña'}
        />
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}
      {info && (
        <p className="rounded-md bg-success/10 p-3 text-sm text-success">{info}</p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === 'signup' ? (provider ? 'Crear cuenta de grúa' : 'Crear cuenta') : 'Ingresar'}
      </Button>

      {mode === 'signin' ? (
        <p className="text-center text-sm text-muted-foreground">
          ¿No tenés cuenta?{' '}
          <Link href="/registro" className="font-medium text-brand-green hover:underline">
            Registrate
          </Link>
        </p>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{' '}
          <Link href="/ingresar" className="font-medium text-brand-green hover:underline">
            Ingresá
          </Link>
        </p>
      )}
    </form>
  );
}

function traducirError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.';
  if (/already registered/i.test(msg)) return 'Ese email ya tiene una cuenta. Probá ingresar.';
  if (/rate limit/i.test(msg)) return 'Demasiados intentos. Esperá un momento.';
  return msg;
}
