'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, AlertCircle, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseConfig } from '@/lib/env';

export function RecoverForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!hasSupabaseConfig) return setError('El acceso todavía no está configurado.');
    const email = String(new FormData(e.currentTarget).get('email'));
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/actualizar-clave`,
    });
    setLoading(false);
    // No revelamos si el email existe o no (buena práctica): siempre "enviado".
    if (error && /rate|over_email_send/i.test(error.message)) {
      return setError(
        'El servicio de emails llegó a su límite por hora. Probá más tarde o configurá un email propio (SMTP) en Supabase.',
      );
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-success/40 bg-success/5 p-4">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <p className="text-sm">
            Si ese email tiene una cuenta, te llegó un enlace para restablecer la contraseña. Revisá
            también el correo no deseado.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/ingresar">Volver a ingresar</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="vos@email.com" />
      </div>
      {error && (
        <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Enviar enlace
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/ingresar" className="font-medium text-brand-green hover:underline">
          Volver a ingresar
        </Link>
      </p>
    </form>
  );
}
