import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/orders/status-badge';
import { AdminCancelOrder } from '@/features/admin/admin-cancel-order';
import { OrderExtrasManager } from '@/features/admin/order-extras-manager';
import { QuoteBreakdownCard } from '@/features/pricing/quote-breakdown';
import { formatDateTime } from '@/lib/format';
import { STATE_LABELS, isTerminal, type OrderState } from '@/features/orders/state-machine';
import type { QuoteBreakdown } from '@/features/pricing/pricing';

export default async function AdminServicioDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: order } = await supabase.from('service_orders').select('*').eq('id', id).single();
  if (!order) notFound();

  const [{ data: events }, { data: payments }, { data: extras }] = await Promise.all([
    supabase.from('order_events').select('*').eq('order_id', id).order('created_at', { ascending: false }),
    supabase.from('payments').select('*').eq('order_id', id).order('created_at', { ascending: false }),
    supabase.from('service_extras').select('*').eq('order_id', id).order('created_at'),
  ]);

  const state = order.state as OrderState;
  const pricing = order.pricing as unknown as QuoteBreakdown | null;

  // Contactos de las dos puntas. Cuando un servicio se corta con plata de por
  // medio hay que poder hablar con ambos ya mismo, no ir a buscar el teléfono.
  const [{ data: cliente }, { data: proveedor }] = await Promise.all([
    order.client_id
      ? supabase.from('profiles').select('first_name, last_name, phone').eq('id', order.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
    order.provider_id
      ? supabase.from('provider_accounts').select('legal_name, contact_phone').eq('id', order.provider_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const contactos = [
    {
      rol: 'Cliente',
      nombre: [cliente?.first_name, cliente?.last_name].filter(Boolean).join(' ') || 'Sin nombre',
      phone: cliente?.phone ?? null,
    },
    {
      rol: 'Grúa',
      nombre: proveedor?.legal_name ?? null,
      phone: proveedor?.contact_phone ?? null,
    },
  ].filter((c) => c.nombre);

  const ABIERTOS: OrderState[] = [
    'paid', 'provider_en_route', 'provider_arrived', 'vehicle_loaded', 'in_transit', 'completion_pending',
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/servicios" className="focus-ring inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Servicio</h1>
        <StatusBadge state={state} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 text-sm">
          <h2 className="mb-2 font-semibold">Ruta</h2>
          <p><strong>Origen:</strong> {order.origin_address ?? '—'}</p>
          <p><strong>Destino:</strong> {order.dest_address ?? '—'}</p>
          <p className="mt-1 text-muted-foreground">Creado {formatDateTime(order.created_at)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 text-sm">
          <h2 className="mb-2 font-semibold">Pagos</h2>
          {(payments ?? []).length === 0 && <p className="text-muted-foreground">Sin pagos.</p>}
          {(payments ?? []).map((p) => (
            <p key={p.id}>{p.status} · {p.mp_payment_id ?? p.mp_preference_id ?? 'sin id MP'}</p>
          ))}
        </div>
      </div>

      {pricing && (
        <details className="rounded-2xl border border-border bg-card p-5">
          <summary className="cursor-pointer font-medium">Desglose económico</summary>
          <div className="mt-4"><QuoteBreakdownCard quote={pricing} /></div>
        </details>
      )}

      <OrderExtrasManager
        orderId={order.id}
        editable={ABIERTOS.includes(state)}
        extras={(extras ?? []).map((e) => ({
          id: e.id,
          category: e.category,
          reason: e.reason,
          amount: e.amount,
        }))}
      />

      {order.cancellation_reason && (
        <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
            Motivo de la cancelación
          </p>
          <p className="mt-1 text-base">{order.cancellation_reason}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Ya se les notificó a las dos partes con este mismo texto.
          </p>
        </div>
      )}

      {contactos.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-1 font-semibold">Contacto de las partes</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Si el servicio se cortó con plata de por medio, acordá acá cómo se resuelve.
          </p>
          <div className="space-y-2">
            {contactos.map((c) => (
              <div key={c.rol} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 p-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.rol}</p>
                  <p className="truncate text-sm font-medium">{c.nombre}</p>
                </div>
                {c.phone ? (
                  <a
                    href={`https://wa.me/${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Hola, te escribo de gruafy por el servicio ${order.id.slice(0, 8)}.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">Sin teléfono cargado</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isTerminal(state) && <AdminCancelOrder orderId={order.id} />}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h2>
        <ol className="space-y-2">
          {(events ?? []).map((e) => (
            <li key={e.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
              <div>
                <p className="font-medium">{e.event}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(e.created_at)}{e.to_state ? ` · ${STATE_LABELS[e.to_state as OrderState]}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
