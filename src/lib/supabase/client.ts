'use client';

import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Cliente de Supabase para componentes del navegador.
 * Usa la clave pública (publishable/anon). Nunca la service role.
 */
export function createClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl!, publicEnv.supabaseKey!);
}
