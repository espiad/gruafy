'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, KeyRound, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publicEnv } from '@/lib/env';

/**
 * Recuperación de contraseña.
 *
 * A propósito NO manda un mail. Todavía no hay dominio propio configurado para el
 * correo saliente, así que el enlace de restablecimiento no llega: la pantalla
 * anterior decía "te llegó un enlace" y dejaba a la persona esperando algo que
 * nunca iba a aparecer. Prometer un mail que no sale es peor que no ofrecerlo.
 *
 * Mientras tanto, dos caminos reales según cómo se creó la cuenta:
 *  - Google: no hay contraseña nuestra que recuperar; se resuelve en Google.
 *  - Mail y contraseña: soporte entrega una temporal y la persona la cambia desde
 *    su perfil (ver `ChangePassword`).
 *
 * PARA REACTIVAR EL MAIL: configurar SMTP propio en Supabase (Auth → SMTP) y
 * volver a llamar a `supabase.auth.resetPasswordForEmail(email, { redirectTo:
 * '/auth/callback?next=/actualizar-clave' })` desde acá.
 */
export function RecoverForm() {
  const [via, setVia] = useState<'google' | 'manual' | null>(null);

  if (via === null) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">¿Cómo creaste tu cuenta?</p>
        <button
          onClick={() => setVia('google')}
          className="focus-ring w-full rounded-xl border border-input bg-card p-4 text-left hover:border-brand-green/50"
        >
          <p className="font-medium">Entré con Google</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Usé el botón &ldquo;Continuar con Google&rdquo;.
          </p>
        </button>
        <button
          onClick={() => setVia('manual')}
          className="focus-ring w-full rounded-xl border border-input bg-card p-4 text-left hover:border-brand-green/50"
        >
          <p className="font-medium">Me registré con mail y contraseña</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Elegí una contraseña al registrarme.</p>
        </button>
        <p className="pt-2 text-center text-sm text-muted-foreground">
          <Link href="/ingresar" className="font-medium text-brand-green hover:underline">
            Volver a ingresar
          </Link>
        </p>
      </div>
    );
  }

  const volver = (
    <button
      onClick={() => setVia(null)}
      className="focus-ring inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Volver
    </button>
  );

  if (via === 'google') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-brand-green/40 bg-brand-green/5 p-4">
          <p className="font-medium">Tu cuenta no tiene contraseña propia</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Al entrar con Google, quien te identifica es Google: nosotros nunca guardamos una
            contraseña tuya. Si no podés entrar, es la contraseña de <strong>tu cuenta de Google</strong>{' '}
            la que hay que recuperar.
          </p>
        </div>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Recuperá tu cuenta de Google desde el sitio de Google.</li>
          <li>Volvé acá y tocá &ldquo;Continuar con Google&rdquo;.</li>
        </ol>
        <Button asChild className="w-full" size="lg">
          <Link href="/ingresar">Ir a ingresar con Google</Link>
        </Button>
        {volver}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-warning/50 bg-warning/10 p-4">
        <p className="font-medium">Por ahora no mandamos mails automáticos</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Todavía no está configurado el correo saliente, así que{' '}
          <strong>no te va a llegar ningún enlace</strong>. Preferimos decírtelo antes que dejarte
          esperando.
        </p>
      </div>

      <div className="rounded-xl border border-border p-4">
        <p className="flex items-center gap-2 font-medium">
          <KeyRound className="h-4 w-4 text-muted-foreground" /> Cómo la recuperás
        </p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Escribinos por WhatsApp con el mail de tu cuenta.</li>
          <li>Verificamos que seas vos y te damos una contraseña temporal.</li>
          <li>Entrás con esa contraseña y la cambiás por la tuya desde <strong>Mi perfil</strong>.</li>
        </ol>
      </div>

      {publicEnv.whatsapp && (
        <a
          href={`https://wa.me/${publicEnv.whatsapp}?text=${encodeURIComponent(
            'Hola, no puedo entrar a gruafy y necesito recuperar mi contraseña. Mi mail es: ',
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 py-3.5 text-base font-semibold text-white"
        >
          <MessageCircle className="h-5 w-5" /> Escribinos por WhatsApp
        </a>
      )}
      {volver}
    </div>
  );
}
