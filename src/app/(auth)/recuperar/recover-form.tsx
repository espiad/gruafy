'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, AlertCircle, MailCheck, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseConfig, publicEnv } from '@/lib/env';

export function RecoverForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!hasSupabaseConfig) return setError('El acceso todavía no está configurado.');
    const email = String(new FormData(e.currentTarget).get('email'));
    setEmailEnviado(email);
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
          <div className="text-sm">
            <p>
              Si <strong>{emailEnviado}</strong> tiene una cuenta, te va a llegar un enlace para
              restablecer la contraseña.
            </p>
            <p className="mt-1 text-muted-foreground">
              Puede tardar unos minutos. Revisá también el correo no deseado.
            </p>
          </div>
        </div>

        {/* Antes esta pantalla era un callejón sin salida: si el mail no llegaba
            —dominio mal configurado, typo en la dirección, filtro del proveedor—
            no había forma de reintentar ni a quién pedirle ayuda. */}
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-medium">¿No te llega?</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Fijate que la dirección esté bien escrita.</li>
            <li>Si entraste con Google, no tenés contraseña: ingresá con el botón de Google.</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSent(false);
                setError(null);
              }}
            >
              Probar con otro email
            </Button>
            {publicEnv.whatsapp && (
              <a
                href={`https://wa.me/${publicEnv.whatsapp}?text=${encodeURIComponent(
                  `Hola, no me llega el mail para recuperar la contraseña de gruafy (${emailEnviado}).`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3.5 py-2 text-sm font-semibold text-white"
              >
                <MessageCircle className="h-4 w-4" /> Escribinos y te ayudamos
              </a>
            )}
          </div>
        </div>

        <Button asChild variant="ghost" className="w-full">
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
