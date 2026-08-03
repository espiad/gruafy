import Link from 'next/link';
import { PlusCircle, ArrowRight, MapPin, Radar, CheckCircle2, HelpCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/orders/status-badge';
import { formatDateTime, formatARS } from '@/lib/format';
import { isTerminal, type OrderState } from '@/features/orders/state-machine';

const ONBOARDING = [
  { icon: PlusCircle, title: 'Cargá tu vehículo', text: 'Auto o moto, marca y modelo. Te ayudamos con las opciones.' },
  { icon: MapPin, title: 'Marcá dónde estás', text: 'Con un toque usás tu ubicación y elegís a dónde va.' },
  { icon: Radar, title: 'Seguí la grúa en vivo', text: 'Una grúa acepta, pagás el anticipo y la ves venir en el mapa.' },
];

export default async function ClienteHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getProfile();

  const { data: orders } = await supabase
    .from('service_orders')
    .select('id, state, origin_address, dest_address, amount_upfront, created_at')
    .eq('client_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const active = (orders ?? []).find((o) => !isTerminal(o.state as OrderState));
  const isNew = !orders || orders.length === 0;
  const firstName = profile?.first_name?.trim() || null;

  // ---- Bienvenida para usuarios nuevos ----
  if (isNew && !active) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-brand-green p-6 text-brand-cream sm:p-8">
          <p className="text-sm text-brand-cream/70">¡Bienvenido{firstName ? `, ${firstName}` : ''} a gruafy!</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl">¿Te quedaste varado?</h1>
          <p className="mt-2 max-w-md text-brand-cream/85">
            Pedí una grúa en 3 pasos simples. Sin llamados, sin esperas eternas y con el precio claro
            antes de aceptar.
          </p>
          <Button asChild size="lg" className="mt-5 w-full sm:w-auto">
            <Link href="/cliente/solicitar">
              <PlusCircle className="h-5 w-5" /> Pedir mi primera grúa
            </Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {ONBOARDING.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-border bg-card p-5">
              <span className="absolute right-4 top-4 font-display text-xl text-brand-orange/40">{i + 1}</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-orange/15 text-brand-green">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="h-4 w-4 text-brand-orange" /> ¿Querés ver cuánto te saldría antes de pedir?
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/simulador">Simulá tu costo</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ---- Dashboard para usuarios que ya usaron gruafy ----
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Hola{firstName ? `, ${firstName}` : ' de nuevo'}</h1>
          <p className="text-sm text-muted-foreground">¿Necesitás una grúa? Resolvámoslo.</p>
        </div>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/cliente/solicitar">
            <PlusCircle className="h-4 w-4" /> Pedir grúa
          </Link>
        </Button>
      </div>

      {active ? (
        <Link href={`/cliente/solicitudes/${active.id}`} className="focus-ring block rounded-2xl border-2 border-brand-orange bg-brand-orange/5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-green">Servicio en curso</span>
            <StatusBadge state={active.state as OrderState} />
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-brand-orange" />
            {active.origin_address ?? 'Origen'} → {active.dest_address ?? 'Destino'}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-green">
            Ver seguimiento <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-brand-orange/60" />
          <h2 className="mt-2 font-semibold">No tenés servicios activos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cuando pidas una grúa, la seguís en vivo desde acá.</p>
          <Button asChild className="mt-4">
            <Link href="/cliente/solicitar">
              <PlusCircle className="h-4 w-4" /> Pedir una grúa
            </Link>
          </Button>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Últimas solicitudes</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {(orders ?? []).map((o) => (
            <li key={o.id}>
              <Link href={`/cliente/solicitudes/${o.id}`} className="focus-ring flex items-center justify-between gap-4 px-4 py-3 hover:bg-accent">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{o.origin_address ?? 'Origen'} → {o.dest_address ?? 'Destino'}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(o.created_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {o.amount_upfront != null && <span className="hidden text-sm tabular-nums text-muted-foreground sm:inline">{formatARS(o.amount_upfront)}</span>}
                  <StatusBadge state={o.state as OrderState} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
