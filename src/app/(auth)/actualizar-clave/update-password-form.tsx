'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseConfig } from '@/lib/env';

export function UpdatePasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verifica que haya una sesión de recuperación activa (venís del enlace del email).
  useEffect(() => {
    if (!hasSupabaseConfig) {
      setReady(false);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setReady(Boolean(data.user)));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const p1 = String(form.get('password'));
    const p2 = String(form.get('password2'));
    if (p1.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (p1 !== p2) return setError('Las contraseñas no coinciden.');

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: p1 });
    setLoading(false);
    if (error) return setError('No pudimos actualizar la contraseña. Pedí un enlace nuevo.');
    setDone(true);
    setTimeout(() => {
      router.push('/cliente');
      router.refresh();
    }, 1400);
  }

  if (ready === false) {
    return (
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> El enlace venció o no es válido. Pedí uno nuevo.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/recuperar">Pedir un enlace nuevo</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-success/40 bg-success/5 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <p className="text-sm">¡Listo! Actualizamos tu contraseña. Te llevamos a tu cuenta…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Al menos 8 caracteres" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password2">Repetir contraseña</Label>
        <Input id="password2" name="password2" type="password" required autoComplete="new-password" />
      </div>
      {error && (
        <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={loading || ready === null}>
        {(loading || ready === null) && <Loader2 className="h-4 w-4 animate-spin" />} Guardar contraseña
      </Button>
    </form>
  );
}
