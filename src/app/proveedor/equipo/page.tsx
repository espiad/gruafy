import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Equipo' };

const ROLE_LABEL = { owner: 'Dueño', driver: 'Conductor' };

export default async function EquipoPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: provider } = await supabase
    .from('provider_accounts')
    .select('id')
    .eq('owner_id', profile!.id)
    .maybeSingle();
  if (!provider) redirect('/proveedor/onboarding');

  const { data: members } = await supabase
    .from('provider_members')
    .select('id, full_name, role, phone, status')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-brand-orange" />
        <h1 className="font-display text-2xl">Equipo</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Una grúa admite un dueño y hasta 5 conductores. Los conductores y su documentación se validan
        con la cuenta.
      </p>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {(members ?? []).map((m) => (
          <li key={m.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{m.full_name}</p>
              <p className="text-xs text-muted-foreground">{m.phone ?? 'Sin teléfono'}</p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {ROLE_LABEL[m.role]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
