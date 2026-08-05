'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isValidDni } from '@/lib/validation/argentina';

const completeSchema = z.object({
  first_name: z.string().min(1, 'Ingresá tu nombre'),
  last_name: z.string().min(1, 'Ingresá tu apellido'),
  phone: z.string().min(6, 'Ingresá un teléfono válido'),
  dni: z.string().refine(isValidDni, 'DNI inválido'),
});

/**
 * Completa el perfil del cliente (nombre, apellido, teléfono y DNI). Se usa cuando
 * el usuario entró con Google (que no pide esos datos) o le faltan. El DNI del
 * consumidor final se guarda en client_profiles.
 */
export async function completeProfile(input: z.infer<typeof completeSchema>) {
  const parsed = completeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const d = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'No autenticado' };

  const { error: pErr } = await supabase
    .from('profiles')
    .update({ first_name: d.first_name, last_name: d.last_name, phone: d.phone })
    .eq('id', user.id);
  if (pErr) return { ok: false as const, error: 'No pudimos guardar tu perfil' };

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { error: cErr } = await admin
    .from('client_profiles')
    .upsert({ id: user.id, dni: d.dni, contact_phone: d.phone }, { onConflict: 'id' });
  if (cErr) return { ok: false as const, error: 'No pudimos guardar el DNI' };

  revalidatePath('/cliente');
  return { ok: true as const };
}

const schema = z.object({
  first_name: z.string().max(80),
  last_name: z.string().max(80),
  phone: z.string().max(30),
});

export async function updateProfile(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'Datos inválidos' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'No autenticado' };

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: parsed.data.first_name || null,
      last_name: parsed.data.last_name || null,
      phone: parsed.data.phone || null,
    })
    .eq('id', user.id);

  if (error) return { ok: false as const, error: 'No pudimos guardar' };
  revalidatePath('/cliente/perfil');
  return { ok: true as const };
}
