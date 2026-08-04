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
              accepted_terms: Boolean(form.get('accept_terms')),
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
      setError(describeAuthError(err));
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    if (!hasSupabaseConfig) {
      setError('Supabase todavía no está configurado.');
      return;
    }
    const supabase = createClient();
    const target = provider ? '/proveedor/onboarding' : next || '/cliente';
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}` },
    });
    // Si no hubo error, el navegador ya está redirigiendo a Google.
    if (error) {
      setError(traducirError(error.message));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Acceso rápido con Google (crea la cuenta al instante si no existe). */}
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        className="focus-ring flex w-full items-center justify-center gap-2.5 rounded-lg border border-input bg-background py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-60"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
          <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
        </svg>
        Continuar con Google
      </button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> o con tu email <span className="h-px flex-1 bg-border" />
      </div>

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

      {mode === 'signup' && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="accept_terms" required className="mt-1 accent-brand-orange" />
          <span>
            Acepto los{' '}
            <a href={provider ? '/legal/terminos-proveedores' : '/legal/terminos-clientes'} target="_blank" className="font-medium text-brand-green underline">
              términos y condiciones
            </a>{' '}
            y la{' '}
            <a href="/legal/privacidad" target="_blank" className="font-medium text-brand-green underline">
              política de privacidad
            </a>
            .
          </span>
        </label>
      )}

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
    </div>
  );
}

/**
 * Extrae un mensaje legible de un error de Supabase Auth. Usa message Y code/status
 * (a veces el message viene vacío o como "{}"), y traduce los casos frecuentes.
 */
function describeAuthError(err: unknown): string {
  const e = err as { message?: unknown; code?: string; status?: number } | null;
  const rawMsg = typeof e?.message === 'string' ? e.message : '';
  const code = e?.code ?? '';
  // Falla del envío de mail (SMTP mal configurado o proveedor rechazando).
  if (code === 'unexpected_failure' || /confirmation email|sending.*email|error sending/i.test(rawMsg)) {
    return 'No pudimos enviar el email de confirmación (falla el envío de mails). Para seguir probando, en Supabase desactivá "Confirm email"; o revisá la configuración de SMTP.';
  }
  const usable = rawMsg && rawMsg !== '{}' && rawMsg !== '[object Object]' ? rawMsg : '';
  if (usable) return traducirError(usable);
  return 'No pudimos completar la acción. Probá de nuevo en un momento.';
}

function traducirError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.';
  if (/already registered|already been registered/i.test(msg)) return 'Ese email ya tiene una cuenta. Probá ingresar.';
  if (/email.*rate|rate.*email|over_email_send/i.test(msg))
    return 'El servicio de emails llegó a su límite por hora. Probá más tarde (o desactivá la confirmación por email para las pruebas).';
  if (/rate limit|too many/i.test(msg)) return 'Hubo muchos pedidos seguidos. Esperá un momento.';
  return msg;
}
