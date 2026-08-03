import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckCircle2, Clock, XCircle, FileWarning } from 'lucide-react';
import { getProfile } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { DocumentsManager } from '@/features/providers/documents-manager';
import { SubmitReviewButton } from '@/features/providers/submit-review-button';
import { OnboardingProgress } from '@/features/providers/onboarding-progress';
import type { ProviderStatus } from '@/types/database';

export const metadata: Metadata = { title: 'Estado de tu solicitud' };

const STATUS_UI: Record<ProviderStatus, { icon: typeof Clock; label: string; tone: string; help: string }> = {
  draft: { icon: FileWarning, label: 'Borrador', tone: 'text-muted-foreground', help: 'Subí la documentación y enviá a revisión.' },
  submitted: { icon: Clock, label: 'Enviada', tone: 'text-warning', help: 'Recibimos tu solicitud. Un administrador la va a revisar.' },
  under_review: { icon: Clock, label: 'En revisión', tone: 'text-warning', help: 'Estamos revisando tu documentación.' },
  approved: { icon: CheckCircle2, label: 'Aprobada', tone: 'text-success', help: '¡Listo! Ya podés ponerte disponible.' },
  rejected: { icon: XCircle, label: 'Con observaciones', tone: 'text-destructive', help: 'Revisá los motivos, corregí y reenviá.' },
  suspended: { icon: XCircle, label: 'Suspendida', tone: 'text-destructive', help: 'Tu cuenta está suspendida. Escribinos a soporte.' },
};

const DOC_TYPES = [
  { key: 'seguro_empresa', label: 'Seguro de la empresa', kind: 'provider' as const },
  { key: 'habilitacion', label: 'Habilitación / RUTA', kind: 'provider' as const },
  { key: 'vtv', label: 'VTV de la grúa', kind: 'truck' as const },
  { key: 'seguro_grua', label: 'Seguro vigente de la grúa', kind: 'truck' as const },
  { key: 'licencia', label: 'Licencia del conductor', kind: 'driver' as const },
  { key: 'linti', label: 'LiNTI (si corresponde)', kind: 'driver' as const },
];

export default async function EstadoSolicitudPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: provider } = await supabase
    .from('provider_accounts')
    .select('*')
    .eq('owner_id', profile!.id)
    .maybeSingle();
  if (!provider) redirect('/proveedor/onboarding');
  if (provider.status === 'approved') redirect('/proveedor');

  const { data: docs } = await supabase
    .from('provider_documents')
    .select('id, doc_type, review_status, admin_note, storage_path, expires_at')
    .eq('provider_id', provider.id);

  const ui = STATUS_UI[provider.status];
  const editable = provider.status === 'draft' || provider.status === 'rejected';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <OnboardingProgress current={editable ? 3 : 4} />

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <ui.icon className={`h-7 w-7 ${ui.tone}`} />
          <div>
            <h1 className="font-display text-xl">{provider.legal_name}</h1>
            <p className={`text-sm font-medium ${ui.tone}`}>{ui.label}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{ui.help}</p>
        {provider.status === 'rejected' && provider.rejection_reason && (
          <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <strong>Motivo:</strong> {provider.rejection_reason}
          </p>
        )}
      </div>

      <DocumentsManager
        providerId={provider.id}
        docTypes={DOC_TYPES}
        existing={docs ?? []}
        editable={editable}
      />

      {editable && (
        <SubmitReviewButton disabled={(docs ?? []).length === 0} />
      )}
    </div>
  );
}
