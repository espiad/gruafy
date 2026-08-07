'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

type Result = { ok: boolean; error?: string };

const schema = z
  .object({
    actual: z.string().min(1, 'Poné tu contraseña actual'),
    nueva: z.string().min(8, 'La contraseña nueva necesita al menos 8 caracteres'),
    repetir: z.string(),
  })
  .refine((d) => d.nueva === d.repetir, {
    message: 'Las dos contraseñas nuevas no coinciden',
    path: ['repetir'],
  });

/**
 * ¿Esta cuenta se registró con mail y contraseña, o con Google?
 *
 * Solo las manuales tienen contraseña que cambiar: las de Google están ancladas a
 * la cuenta de Google y se manejan allá. Lo resolvemos por las identidades que
 * devuelve Auth, no por una bandera nuestra que se puede desincronizar.
 */
export async function tieneContrasena(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const identidades = user.identities ?? [];
  if (identidades.length > 0) return identidades.some((i) => i.provider === 'email');
  // Fallback por si el cliente no devuelve `identities` en esta versión.
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [
    user.app_metadata?.provider as string | undefined,
  ];
  return providers.filter(Boolean).includes('email');
}

/**
 * Cambio de contraseña del propio titular. Pide la actual y la verifica de verdad
 * (Supabase permite cambiarla sin pedirla, pero entonces cualquiera con la sesión
 * abierta en un dispositivo prestado se quedaría con la cuenta).
 */
export async function changePassword(input: z.infer<typeof schema>): Promise<Result> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: 'No autenticado' };

  if (!(await tieneContrasena())) {
    return { ok: false, error: 'Entraste con Google: tu contraseña se cambia desde tu cuenta de Google.' };
  }

  // Verificación de identidad: reintentamos el login con la contraseña actual.
  const { error: errLogin } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.actual,
  });
  if (errLogin) return { ok: false, error: 'La contraseña actual no es correcta.' };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.nueva });
  if (error) {
    const debil = /weak|short|password/i.test(error.message);
    return { ok: false, error: debil ? 'Elegí una contraseña más larga o menos común.' : 'No pudimos cambiarla. Probá de nuevo.' };
  }
  return { ok: true };
}
