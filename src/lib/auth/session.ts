import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { ProfileRow, UserRole } from '@/types/database';

/** Devuelve el usuario autenticado o null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Devuelve el perfil (con rol) del usuario actual, o null. */
export async function getProfile(): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data;
}

/** Exige sesión; si no hay, redirige a /ingresar conservando el destino. */
export async function requireUser(next = '/') {
  const user = await getUser();
  if (!user) redirect(`/ingresar?next=${encodeURIComponent(next)}`);
  return user;
}

/** Exige un rol específico (o admin). Redirige si no cumple. */
export async function requireRole(roles: UserRole[], next = '/') {
  const profile = await getProfile();
  if (!profile) redirect(`/ingresar?next=${encodeURIComponent(next)}`);
  if (profile.role !== 'admin' && !roles.includes(profile.role)) {
    redirect('/');
  }
  return profile;
}

/** Ruta del panel según rol. */
export function homeForRole(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'provider_owner':
    case 'provider_driver':
      return '/proveedor';
    default:
      return '/cliente';
  }
}
