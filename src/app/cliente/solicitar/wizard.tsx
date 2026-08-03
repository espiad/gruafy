'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete } from '@/components/maps/address-autocomplete';
import { QuoteBreakdownCard } from '@/features/pricing/quote-breakdown';
import { quote, type PricingSettings } from '@/features/pricing/pricing';
import { hasGeoapify, route, type GeoPoint } from '@/lib/geoapify';
import { normalizePatente, isValidPatente } from '@/lib/validation/argentina';
import { formatDistance } from '@/lib/format';
import { createOrder } from '@/features/orders/actions';

interface VehicleLite {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  patente: string;
  gearbox: 'manual' | 'automatic' | 'unknown';
  gearbox_locked: boolean | null;
  has_keys: boolean | null;
}

const STEPS = ['Vehículo', 'Ubicación', 'Presupuesto'] as const;

export function SolicitarWizard({
  vehicles,
  pricing,
  maxPasajeros,
}: {
  vehicles: VehicleLite[];
  pricing: PricingSettings;
  maxPasajeros: number;
}) {
  const router = useRouter();
  const geo = hasGeoapify();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Paso 1 — vehículo
  const [vehicleId, setVehicleId] = useState<string | null>(vehicles[0]?.id ?? null);
  const [useNew, setUseNew] = useState(vehicles.length === 0);
  const [nv, setNv] = useState({ brand: '', model: '', year: '', patente: '', gearbox: 'unknown' as VehicleLite['gearbox'], gearbox_locked: false, has_keys: true });

  // Paso 2 — ubicación
  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  const [dest, setDest] = useState<GeoPoint | null>(null);
  const [manualKm, setManualKm] = useState(10);
  const [routedMeters, setRoutedMeters] = useState<number | null>(null);
  const [routing, setRouting] = useState(false);

  // Paso 3 — condiciones
  const [dollys, setDollys] = useState(0);
  const [wheels, setWheels] = useState(0);
  const [terms, setTerms] = useState(false);

  const distanceMeters = routedMeters ?? manualKm * 1000;
  const breakdown = useMemo(() => quote({ distanceMeters, dollys }, pricing), [distanceMeters, dollys, pricing]);

  async function recompute(o: GeoPoint | null, d: GeoPoint | null) {
    if (!geo || !o || !d) return;
    setRouting(true);
    const r = await route(o, d);
    setRouting(false);
    if (r) setRoutedMeters(r.distanceMeters);
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (useNew) {
        if (!nv.brand || !nv.model) return 'Completá marca y modelo';
        if (!isValidPatente(nv.patente)) return 'Patente inválida (AAA123 o AB123CD)';
      } else if (!vehicleId) return 'Elegí un vehículo';
    }
    if (step === 1) {
      if (geo && (!origin || !dest)) return 'Elegí origen y destino';
      if (!geo) {
        // modo estimación: pedimos direcciones de texto mínimas
        if (!origin?.address || !dest?.address) return 'Ingresá origen y destino';
      }
    }
    return null;
  }

  function next() {
    const e = validateStep();
    if (e) return setError(e);
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function submit() {
    if (!terms) return setError('Tenés que aceptar los términos');
    if (!origin || !dest) return setError('Falta la ubicación');
    setError(null);
    startTransition(async () => {
      const res = await createOrder({
        vehicle_id: useNew ? undefined : vehicleId ?? undefined,
        vehicle: useNew
          ? {
              brand: nv.brand,
              model: nv.model,
              year: nv.year ? Number(nv.year) : undefined,
              patente: normalizePatente(nv.patente),
              gearbox: nv.gearbox,
              gearbox_locked: nv.gearbox_locked,
              has_keys: nv.has_keys,
            }
          : undefined,
        origin,
        dest,
        distance_meters: distanceMeters,
        duration_seconds: Math.round((distanceMeters / 1000 / 30) * 3600),
        dollys,
        wheels_blocked: wheels,
        conditions: { public_road: true },
        accepted_terms: true,
      });
      if (!res.ok) return setError(res.error ?? 'No pudimos crear la solicitud');
      router.push(`/cliente/solicitudes/${res.orderId}`);
    });
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                i <= step ? 'bg-brand-orange text-brand-ink' : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </span>
            <span className={i === step ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-border bg-card p-6">
        {step === 0 && (
          <div className="space-y-4">
            {vehicles.length > 0 && (
              <div className="space-y-2">
                <Label>Elegí tu vehículo</Label>
                {vehicles.map((v) => (
                  <label
                    key={v.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${
                      !useNew && vehicleId === v.id ? 'border-brand-orange bg-brand-orange/10' : 'border-input'
                    }`}
                  >
                    <input
                      type="radio"
                      name="veh"
                      className="accent-brand-orange"
                      checked={!useNew && vehicleId === v.id}
                      onChange={() => {
                        setUseNew(false);
                        setVehicleId(v.id);
                      }}
                    />
                    <span>
                      <strong>{v.brand} {v.model}</strong> {v.year ?? ''} · {v.patente}
                    </span>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setUseNew(true)}
                  className={`w-full rounded-lg border p-3 text-left text-sm ${useNew ? 'border-brand-orange bg-brand-orange/10' : 'border-dashed border-input'}`}
                >
                  + Cargar otro vehículo
                </button>
              </div>
            )}

            {useNew && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="brand">Marca</Label>
                  <Input id="brand" value={nv.brand} onChange={(e) => setNv({ ...nv, brand: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model">Modelo</Label>
                  <Input id="model" value={nv.model} onChange={(e) => setNv({ ...nv, model: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="year">Año</Label>
                  <Input id="year" inputMode="numeric" value={nv.year} onChange={(e) => setNv({ ...nv, year: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="patente">Patente</Label>
                  <Input id="patente" value={nv.patente} onChange={(e) => setNv({ ...nv, patente: e.target.value.toUpperCase() })} placeholder="AB123CD" />
                </div>
                <div className="space-y-1.5">
                  <Label>Caja</Label>
                  <div className="flex gap-2">
                    {(['manual', 'automatic', 'unknown'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setNv({ ...nv, gearbox: g })}
                        className={`h-10 flex-1 rounded-md border text-xs ${nv.gearbox === g ? 'border-brand-orange bg-brand-orange/10' : 'border-input'}`}
                      >
                        {g === 'manual' ? 'Manual' : g === 'automatic' ? 'Automática' : 'No sé'}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 self-end text-sm">
                  <input type="checkbox" className="accent-brand-orange" checked={nv.has_keys} onChange={(e) => setNv({ ...nv, has_keys: e.target.checked })} />
                  Tengo las llaves
                </label>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {!geo && (
              <div className="flex items-start gap-2 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Sin mapa configurado usamos una estimación por distancia. La ruta exacta se calcula al confirmar.</p>
              </div>
            )}
            {geo ? (
              <>
                <AddressAutocomplete
                  label="¿Dónde estás? (punto A)"
                  placeholder="Dirección de origen"
                  onSelect={(p) => { setOrigin(p); setRoutedMeters(null); void recompute(p, dest); }}
                />
                <AddressAutocomplete
                  label="¿A dónde lo llevás? (punto B)"
                  placeholder="Dirección de destino"
                  onSelect={(p) => { setDest(p); setRoutedMeters(null); void recompute(origin, p); }}
                />
                {routing && <p className="text-sm text-muted-foreground">Calculando ruta…</p>}
                {routedMeters != null && (
                  <p className="text-sm text-muted-foreground">Ruta estimada: <strong>{formatDistance(routedMeters)}</strong></p>
                )}
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="oa">Origen</Label>
                  <Input id="oa" placeholder="Dirección de origen" onChange={(e) => setOrigin({ address: e.target.value, lat: -34.6037, lng: -58.3816 })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob">Destino</Label>
                  <Input id="ob" placeholder="Dirección de destino" onChange={(e) => setDest({ address: e.target.value, lat: -34.6037, lng: -58.3816 })} />
                </div>
                <div>
                  <Label>Distancia aproximada: {manualKm} km</Label>
                  <input type="range" min={1} max={80} value={manualKm} onChange={(e) => setManualKm(Number(e.target.value))} className="w-full accent-brand-orange" />
                </div>
              </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Dollys necesarios</Label>
                <div className="mt-1 flex gap-2">
                  {[0, 1, 2].map((n) => (
                    <button key={n} type="button" onClick={() => setDollys(n)} className={`h-10 flex-1 rounded-md border text-sm ${dollys === n ? 'border-brand-orange bg-brand-orange/10' : 'border-input'}`}>
                      {n === 0 ? 'Ninguno' : n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Ruedas bloqueadas/faltantes</Label>
                <div className="mt-1 flex gap-2">
                  {[0, 1, 2, 3, 4].map((n) => (
                    <button key={n} type="button" onClick={() => setWheels(n)} className={`h-10 flex-1 rounded-md border text-sm ${wheels === n ? 'border-brand-orange bg-brand-orange/10' : 'border-input'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <QuoteBreakdownCard quote={breakdown} />
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p>· El gruero no espera; las esperas se cobran aparte.</p>
              <p>· El precio no incluye peajes ni adicionales (se suman al final).</p>
              <p>· Viajan como máximo {maxPasajeros} personas con el vehículo.</p>
              <p>· Ni gruafy ni el gruero se responsabilizan por daños previos o roturas ajenas a la operación.</p>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 accent-brand-orange" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              Acepto los términos del servicio y el presupuesto. Entiendo que primero una grúa acepta y luego pago el anticipo.
            </label>
          </div>
        )}

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
          Atrás
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>Continuar</Button>
        ) : (
          <Button onClick={submit} disabled={pending} size="lg">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Buscar grúa
          </Button>
        )}
      </div>
    </div>
  );
}
