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

export interface Compliance {
  drivers: DriverStatus[];
  /** Conductores a los que les falta algo (DNI, licencia o foto). */
  incompletos: DriverStatus[];
  alDia: boolean;
  /** Fecha límite para regularizar. null si no se pudo determinar. */
  deadline: Date | null;
  diasRestantes: number | null;
  vencido: boolean;
}

/** Clave del "documento" interno donde guardamos la fecha límite del proveedor. */
export const PLAZO_DOC_TYPE = 'plazo_conductores';

/**
 * Estado de cumplimiento documental de un proveedor: qué le falta a cada conductor
 * y cuánto tiempo le queda para regularizar. El plazo se guarda como un registro
 * interno en `provider_documents` (doc_type = plazo_conductores) al aprobar la
 * cuenta; si no existe, se estima desde el alta.
 */
export async function getCompliance(
  supabase: SupabaseClient<Database>,
  providerId: string,
  diasGracia: number,
  createdAt?: string | null,
): Promise<Compliance> {
  const drivers = await getDriversWithStatus(supabase, providerId);
  const incompletos = drivers.filter((d) => !d.complete);

  const { data: plazo } = await supabase
    .from('provider_documents')
    .select('expires_at')
    .eq('provider_id', providerId)
    .eq('doc_type', PLAZO_DOC_TYPE)
    .maybeSingle();

  let deadline: Date | null = null;
  if (plazo?.expires_at) deadline = new Date(plazo.expires_at);
  else if (createdAt) deadline = new Date(new Date(createdAt).getTime() + diasGracia * 86400000);

  const diasRestantes = deadline
    ? Math.ceil((deadline.getTime() - Date.now()) / 86400000)
    : null;

  return {
    drivers,
    incompletos,
    alDia: incompletos.length === 0,
    deadline,
    diasRestantes,
    vencido: diasRestantes !== null && diasRestantes < 0,
  };
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
