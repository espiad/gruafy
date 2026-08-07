'use server';

import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';

type Result = { ok: boolean; error?: string };

const ABIERTOS: import('@/types/database').OrderStateDb[] = [
  'searching_provider', 'provider_reserved', 'awaiting_payment', 'payment_pending',
  'paid', 'provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit', 'completion_pending',
];

/**
 * Baja de cuenta a pedido del titular (derecho de supresión, Ley 25.326).
 *
 * NO es un `delete` a secas: `service_orders.client_id` tiene `on delete restrict`
 * porque los registros de servicios prestados y cobrados hay que conservarlos por
 * obligaciones contables e impositivas. Borrar el perfil fallaría, y forzarlo se
 * llevaría puesta la contabilidad.
 *
 * Lo que se hace es ANONIMIZAR, que es la forma correcta de conciliar las dos
 * obligaciones: se elimina todo dato personal (nombre, teléfono, DNI, vehículos,
 * documentos, suscripciones push), se libera el mail y se inhabilita el acceso.
 * Lo que queda de la orden ya no identifica a nadie.
 */
export async function deleteMyAccount(confirmacion: string): Promise<Result> {
  if (confirmacion.trim().toUpperCase() !== 'ELIMINAR') {
    return { ok: false, error: 'Escribí ELIMINAR para confirmar.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();

  const { data: profile } = await admin.from('profiles').select('role, status').eq('id', user.id).single();
  if (!profile) return { ok: false, error: 'Perfil no encontrado' };
  if (profile.role === 'admin') {
    return { ok: false, error: 'Una cuenta de administración no se elimina sola: pedíselo a otro administrador.' };
  }

  // Con un servicio abierto hay alguien del otro lado esperando (y posiblemente
  // plata en juego). Primero se cierra.
  const { count: comoCliente } = await admin
    .from('service_orders')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', user.id)
    .in('state', ABIERTOS);
  if ((comoCliente ?? 0) > 0) {
    return { ok: false, error: 'Tenés un auxilio en curso. Esperá a que termine o cancelalo antes de eliminar la cuenta.' };
  }

  const { data: cuentaProveedor } = await admin
    .from('provider_accounts')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (cuentaProveedor) {
    const { count: comoGrua } = await admin
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', cuentaProveedor.id)
      .in('state', ABIERTOS);
    if ((comoGrua ?? 0) > 0) {
      return { ok: false, error: 'Tenés servicios en curso. Cerralos antes de eliminar la cuenta.' };
    }
  }

  // 1) Datos personales en tablas propias.
  await admin.from('client_profiles').delete().eq('id', user.id);
  await admin.from('vehicles').delete().eq('client_id', user.id);
  await admin.from('push_subscriptions').delete().eq('user_id', user.id);
  await admin.from('notifications').delete().eq('user_id', user.id);

  // 2) Si tenía grúa: baja de la calle y borrado de la documentación (DNI,
  //    licencias y fotos son lo más sensible que guardamos).
  if (cuentaProveedor) {
    const { data: docs } = await admin
      .from('provider_documents')
      .select('storage_path')
      .eq('provider_id', cuentaProveedor.id);
    const rutas = (docs ?? [])
      .map((d) => d.storage_path)
      .filter((p): p is string => Boolean(p) && !p.startsWith('('));
    if (rutas.length > 0) {
      await admin.storage.from('documents').remove(rutas);
    }
    await admin.from('provider_documents').delete().eq('provider_id', cuentaProveedor.id);
    await admin
      .from('provider_accounts')
      .update({
        is_available: false,
        status: 'rejected',
        contact_phone: null,
        contact_email: null,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', cuentaProveedor.id);
  }

  // 3) Anonimizar el perfil (la fila queda para no romper las órdenes históricas).
  const { data: anonimizado, error: errPerfil } = await admin
    .from('profiles')
    .update({
      first_name: 'Cuenta',
      last_name: 'eliminada',
      phone: null,
      avatar_url: null,
      status: 'deleted',
    })
    .eq('id', user.id)
    .select('id');
  if (errPerfil || !anonimizado || anonimizado.length === 0) {
    return { ok: false, error: 'No pudimos completar la baja. Escribinos y lo resolvemos.' };
  }

  // 4) Liberar el mail e inhabilitar el acceso. Se cambia por uno inexistente para
  //    que la persona pueda volver a registrarse con su dirección real si quiere.
  await admin.auth.admin.updateUserById(user.id, {
    email: `eliminada+${user.id}@cuentas.invalid`,
    password: randomUUID(),
    user_metadata: { deleted_at: new Date().toISOString() },
  });

  await supabase.auth.signOut();
  return { ok: true };
}
