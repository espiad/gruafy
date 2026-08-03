import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Auditoría' };

export default async function AdminAuditoria() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from('admin_audit_logs')
    .select('id, action, entity, entity_id, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl">Auditoría</h1>
      <p className="text-sm text-muted-foreground">Acciones administrativas registradas de forma inmutable.</p>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {(logs ?? []).map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{l.action}</p>
              <p className="text-xs text-muted-foreground">{l.entity} {l.entity_id ? `· ${l.entity_id}` : ''}</p>
            </div>
            <span className="text-xs text-muted-foreground">{formatDateTime(l.created_at)}</span>
          </li>
        ))}
        {(!logs || logs.length === 0) && <li className="p-8 text-center text-sm text-muted-foreground">Sin acciones registradas.</li>}
      </ul>
    </div>
  );
}
