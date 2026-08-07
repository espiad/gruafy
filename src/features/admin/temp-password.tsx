'use client';

import { useState, useTransition } from 'react';
import { Loader2, KeyRound, Copy, Check, MessageCircle } from 'lucide-react';
import { adminSetPassword } from './actions';
import { publicEnv } from '@/lib/env';

/**
 * Contraseña temporal para soporte. Es la pieza que cierra el circuito de
 * "olvidé mi contraseña" mientras no haya envío de mails: la persona escribe por
 * WhatsApp, acá se le genera una temporal, se la pasamos, entra y la cambia desde
 * su perfil.
 *
 * Se genera sola en vez de dejar que la escriba el admin: así no se repite siempre
 * la misma para todos, que es lo que termina pasando.
 */
function generar(): string {
  // Sin caracteres ambiguos (0/O, 1/l/I): esto se dicta o se copia a mano.
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const num = '23456789';
  const letras = Array.from({ length: 3 }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
  const digitos = Array.from({ length: 4 }, () => num[Math.floor(Math.random() * num.length)]).join('');
  return `gruafy-${letras}${digitos}`;
}

export function TempPassword({ userId, email }: { userId: string; email: string }) {
  const [pending, start] = useTransition();
  const [clave, setClave] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function crear() {
    setError(null);
    const nueva = generar();
    start(async () => {
      const res = await adminSetPassword({ userId, password: nueva });
      if (res.ok) setClave(nueva);
      else setError(res.error ?? 'No pudimos generarla');
    });
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(clave ?? '');
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: la clave está a la vista para copiarla a mano.
      setError('No pudimos copiarla sola. Seleccionala y copiala a mano.');
    }
  }

  if (clave) {
    const mensaje =
      `Hola, soy de soporte de gruafy. Te generamos una contraseña temporal para que puedas entrar:\n\n` +
      `${clave}\n\n` +
      `Entrá con tu mail (${email}) y esa contraseña, y cambiala por una tuya desde Mi perfil.`;
    return (
      <div className="mt-2 rounded-lg border border-success/40 bg-success/5 p-3">
        <p className="text-xs font-medium text-success">Contraseña temporal generada</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <code className="select-all rounded bg-card px-2.5 py-1.5 font-mono text-base font-semibold">
            {clave}
          </code>
          <button
            onClick={copiar}
            className="focus-ring inline-flex items-center gap-1 rounded-md border border-input px-2 py-1.5 text-xs font-medium"
          >
            {copiado ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copiado ? 'Copiada' : 'Copiar'}
          </button>
          {publicEnv.whatsapp && (
            <a
              href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-1 rounded-md bg-[#25D366] px-2.5 py-1.5 text-xs font-semibold text-white"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Mandar por WhatsApp
            </a>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          La anterior ya no sirve. Decile que la cambie desde <strong>Mi perfil</strong> apenas entre.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={crear}
        disabled={pending}
        className="focus-ring inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
        Dar contraseña temporal
      </button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
