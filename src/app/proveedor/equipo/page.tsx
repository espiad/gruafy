import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth/session';
import { AddDriverForm } from '@/features/providers/add-driver-form';
import { DriverLicenseUpload } from '@/features/providers/driver-license-upload';
import { DriverPhotoUpload } from '@/features/providers/driver-photo-upload';

export const metadata: Metadata = { title: 'Equipo' };

const ROLE_LABEL = { owner: 'Conductor dueño', driver: 'Conductor' };

export default async function EquipoPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: provider } = await supabase
    .from('provider_accounts')
    .select('id, status')
    .eq('owner_id', profile!.id)
    .maybeSingle();
  if (!provider) redirect('/proveedor/onboarding');

  const { data: members } = await supabase
    .from('provider_members')
    .select('id, full_name, dni, role, phone, status')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: true });

  // Documentos por miembro (legajo): licencia y foto. La última cargada por tipo.
  const { data: docs } = await supabase
    .from('provider_documents')
    .select('id, member_id, doc_type, review_status, admin_note, created_at')
    .eq('provider_id', provider.id)
    .eq('owner_kind', 'driver')
    .in('doc_type', ['licencia', 'foto'])
    .order('created_at', { ascending: false });
  type DocEntry = { id: string; review_status: 'pending' | 'approved' | 'rejected'; admin_note: string | null };
  const licenseByMember = new Map<string, DocEntry>();
  const photoByMember = new Map<string, DocEntry>();
  for (const d of docs ?? []) {
    if (!d.member_id) continue;
    const target = d.doc_type === 'foto' ? photoByMember : licenseByMember;
    if (!target.has(d.member_id)) {
      target.set(d.member_id, { id: d.id, review_status: d.review_status, admin_note: d.admin_note });
    }
  }

  const drivers = (members ?? []).filter((m) => m.role === 'driver').length;
  const canAdd = provider.status === 'approved' && drivers < 4;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-brand-orange" />
        <h1 className="font-display text-2xl">Equipo</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        La cuenta tiene un conductor dueño (base) y podés sumar hasta <strong>4 conductores más</strong>.
        Cada uno y su documentación se validan con la cuenta.
      </p>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {(members ?? []).map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{m.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {[m.dni ? `DNI ${m.dni}` : null, m.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <DriverPhotoUpload
                providerId={provider.id}
                memberId={m.id}
                existing={photoByMember.get(m.id) ?? null}
              />
              <DriverLicenseUpload
                providerId={provider.id}
                memberId={m.id}
                existing={licenseByMember.get(m.id) ?? null}
              />
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{ROLE_LABEL[m.role]}</span>
            </div>
          </li>
        ))}
      </ul>

      {provider.status !== 'approved' ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Vas a poder sumar conductores cuando la cuenta esté aprobada.
        </p>
      ) : canAdd ? (
        <AddDriverForm remaining={4 - drivers} />
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Llegaste al máximo de 4 conductores adicionales.
        </p>
      )}
    </div>
  );
}
