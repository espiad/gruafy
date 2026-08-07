import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldAlert, MessageCircle } from 'lucide-react';
import { getProfile } from '@/lib/auth/session';
import { publicEnv } from '@/lib/env';

export const metadata = { title: 'Cuenta bloqueada · gruafy' };

/**
 * Pantalla para una cuenta suspendida o dada de baja. Es la única ruta privada que
 * un usuario bloqueado puede ver: los layouts de cliente, proveedor y admin lo
 * mandan acá.
 */
export default async function CuentaBloqueada() {
  const profile = await getProfile();
  if (!profile) redirect('/ingresar');
  if (profile.status === 'active') redirect('/');

  const eliminada = profile.status === 'deleted';

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border-2 border-destructive/40 bg-card p-6 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-3 font-display text-2xl">
          {eliminada ? 'Esta cuenta fue eliminada' : 'Tu cuenta está bloqueada'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {eliminada
            ? 'Se eliminaron tus datos a pedido tuyo. Si querés volver a usar gruafy, registrate de nuevo con tu mail.'
            : 'Un administrador suspendió el acceso. Escribinos y lo revisamos: si fue un error, lo destrabamos en el momento.'}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          {!eliminada && publicEnv.whatsapp && (
            <a
              href={`https://wa.me/${publicEnv.whatsapp}?text=${encodeURIComponent('Hola, mi cuenta de gruafy figura bloqueada y quiero consultar por qué.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 py-3 text-sm font-semibold text-white"
            >
              <MessageCircle className="h-4 w-4" /> Escribir a soporte
            </a>
          )}
          <Link
            href={eliminada ? '/registro' : '/'}
            className="focus-ring inline-flex items-center justify-center rounded-lg border border-input px-5 py-3 text-sm font-medium"
          >
            {eliminada ? 'Crear una cuenta nueva' : 'Volver al inicio'}
          </Link>
        </div>
      </div>
    </div>
  );
}
