import 'server-only';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

let configured = false;
function ensureConfigured(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:soporte@gruafy.app';
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Envía una notificación push a TODOS los dispositivos suscriptos de un usuario.
 * Best-effort: nunca lanza (no debe romper el flujo que la dispara). Limpia las
 * suscripciones muertas (410/404). Requiere las claves VAPID configuradas.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  try {
    if (!ensureConfigured() || !userId) return;
    const admin = createAdminClient();
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);
    if (!subs || subs.length === 0) return;

    const body = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? '/' });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
          }
        }
      }),
    );
  } catch {
    /* nunca romper el flujo que dispara la notificación */
  }
}
