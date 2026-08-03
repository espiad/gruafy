import 'server-only';
import { createClient as createAdminBase } from '@supabase/supabase-js';
import { publicEnv, serverEnv } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Cliente con service role. SOLO servidor, para operaciones que deben saltar RLS
 * de forma controlada (webhooks de MP, asignación atómica, promoción de admin).
 * Jamás debe importarse desde código cliente.
 */
export function createAdminClient() {
  const key = serverEnv.serviceRoleKey();
  if (!publicEnv.supabaseUrl || !key) {
    throw new Error('Supabase service role no configurado (SUPABASE_SERVICE_ROLE_KEY).');
  }
  return createAdminBase<Database>(publicEnv.supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
