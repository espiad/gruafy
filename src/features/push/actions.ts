'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/**
 * Guarda la suscripción de push del usuario autenticado (una por dispositivo).
 * Escribe con service role (la tabla no tiene policies para usuarios). Upsert por
 * endpoint, reasignándolo al usuario actual si cambió de cuenta en ese navegador.
 */
export async function savePushSubscription(sub: unknown, userAgent?: string): Promise<{ ok: boolean }> {
  const parsed = subSchema.safeParse(sub);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { error } = await admin.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: userAgent?.slice(0, 300) ?? null,
    },
    { onConflict: 'endpoint' },
  );
  return { ok: !error };
}

/** Elimina una suscripción (al desactivar notificaciones o cerrar sesión). */
export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  await admin.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id);
  return { ok: true };
}
