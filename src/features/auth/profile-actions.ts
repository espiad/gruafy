'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

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
