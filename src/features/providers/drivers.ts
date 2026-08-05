import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export interface DriverStatus {
  id: string;
  full_name: string;
  role: 'owner' | 'driver';
  complete: boolean;
  missing: string[];
}

/**
 * Estado de completitud de cada conductor de un proveedor. Un conductor es
 * "seleccionable" para tomar un auxilio solo si tiene nombre, DNI, teléfono,
 * licencia y foto. Se usa para gatear la disponibilidad y el selector de la oferta.
 */
export async function getDriversWithStatus(
  supabase: SupabaseClient<Database>,
  providerId: string,
): Promise<DriverStatus[]> {
  const [{ data: members }, { data: docs }] = await Promise.all([
    supabase
      .from('provider_members')
      .select('id, full_name, role, dni, phone, status')
      .eq('provider_id', providerId)
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
    supabase
      .from('provider_documents')
      .select('member_id, doc_type')
      .eq('provider_id', providerId)
      .eq('owner_kind', 'driver')
      .in('doc_type', ['licencia', 'foto']),
  ]);

  const docsByMember = new Map<string, Set<string>>();
  for (const d of docs ?? []) {
    if (!d.member_id) continue;
    const set = docsByMember.get(d.member_id) ?? new Set<string>();
    set.add(d.doc_type);
    docsByMember.set(d.member_id, set);
  }

  return (members ?? []).map((m) => {
    const dt = docsByMember.get(m.id) ?? new Set<string>();
    const missing: string[] = [];
    if (!m.full_name) missing.push('nombre');
    if (!m.dni) missing.push('DNI');
    if (!m.phone) missing.push('teléfono');
    if (!dt.has('licencia')) missing.push('licencia');
    if (!dt.has('foto')) missing.push('foto');
    return { id: m.id, full_name: m.full_name, role: m.role, complete: missing.length === 0, missing };
  });
}
