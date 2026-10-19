'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  COOKIE_PATH,
  LOCK_MINUTES,
  MAX_TRIES,
  SESSION_COOKIE,
  TRY_COOKIE,
  checkPassword,
  isValidSession,
  newSessionToken,
  normalizeTicketUrl,
  readTries,
  setTicketUrl,
  writeTries,
} from './server';
import { revalidatePath } from 'next/cache';

const isProd = process.env.NODE_ENV === 'production';

export async function rushLogin(_prev: { error?: string } | null, form: FormData): Promise<{ error?: string }> {
  const jar = await cookies();
  const tries = readTries(jar.get(TRY_COOKIE)?.value);

  if (tries.n >= MAX_TRIES) {
    const restan = Math.max(1, Math.ceil((tries.first + LOCK_MINUTES * 60000 - Date.now()) / 60000));
    return { error: `Demasiados intentos. Probá de nuevo en ${restan} min.` };
  }

  const pass = String(form.get('password') ?? '');
  if (!checkPassword(pass)) {
    jar.set(TRY_COOKIE, writeTries({ n: tries.n + 1, first: tries.first }), {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: COOKIE_PATH,
      maxAge: LOCK_MINUTES * 60,
    });
    // Pequeña demora: encarece cualquier intento automatizado.
    await new Promise((r) => setTimeout(r, 600));
    return { error: 'Contraseña incorrecta.' };
  }

  const s = newSessionToken();
  jar.set(SESSION_COOKIE, s.value, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: COOKIE_PATH,
    maxAge: s.maxAge,
  });
  jar.delete({ name: TRY_COOKIE, path: COOKIE_PATH });
  redirect('/rushfrankia');
}

/**
 * Guarda la URL de la ticketera. Verifica la sesión ACÁ ADENTRO: una server action
 * se puede invocar directo, así que no alcanza con que el formulario esté detrás
 * del login.
 */
export async function rushSaveTicketUrl(
  _prev: { ok?: boolean; error?: string } | null,
  form: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) return { error: 'Tu sesión venció. Volvé a entrar.' };

  const r = normalizeTicketUrl(String(form.get('ticket_url') ?? ''));
  if (!r.ok) return { error: r.error };
  if (!(await setTicketUrl(r.url))) return { error: 'No se pudo guardar. Probá de nuevo.' };

  revalidatePath('/rushfrankia');
  return { ok: true };
}

export async function rushLogout() {
  const jar = await cookies();
  jar.delete({ name: SESSION_COOKIE, path: COOKIE_PATH });
  redirect('/rushfrankia');
}
