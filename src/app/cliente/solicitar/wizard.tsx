'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, Info, Car, Bike, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LocationPicker } from '@/components/maps/location-picker';
import { QuoteBreakdownCard } from '@/features/pricing/quote-breakdown';
import { quote, type PricingSettings } from '@/features/pricing/pricing';
import { hasGeoapify, type GeoPoint } from '@/lib/geoapify';
import { normalizePatente, isValidPatente } from '@/lib/validation/argentina';
import { brandsFor, type VehicleType } from '@/features/orders/vehicle-data';
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
  const [vType, setVType] = useState<VehicleType>('auto');
  const [nv, setNv] = useState({ brand: '', model: '', year: '', patente: '', gearbox: 'unknown' as VehicleLite['gearbox'], has_keys: true });

  // Paso 2 — ubicación
  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  const [dest, setDest] = useState<GeoPoint | null>(null);
  const [routedMeters, setRoutedMeters] = useState<number | null>(null);
  const [routedSeconds, setRoutedSeconds] = useState<number | null>(null);
  const [manualKm, setManualKm] = useState(10);

  // Paso 3 — condiciones
  const [dollys, setDollys] = useState(0);
  const [wheels, setWheels] = useState(0);
  const [terms, setTerms] = useState(false);

  // Distancia efectiva: ruta real si existe; si no hay mapa, estimación por km.
  const distanceMeters = geo ? (routedMeters ?? 0) : manualKm * 1000;
  const breakdown = useMemo(
    () => quote({ distanceMeters: Math.max(distanceMeters, 1000), dollys }, pricing),
    [distanceMeters, dollys, pricing],
  );

  function validateStep(): string | null {
    if (step === 0) {
      if (useNew) {
        if (!nv.brand || !nv.model) return 'Completá marca y modelo';
        if (!isValidPatente(nv.patente)) return 'Revisá la patente (formato AB123CD o AAA123)';
      } else if (!vehicleId) return 'Elegí un vehículo';
    }
    if (step === 1) {
      if (!origin || !dest) return 'Marcá el origen y el destino';
      if (geo && !(routedMeters && routedMeters > 0)) {
        return 'Esperá a que calculemos la ruta, o revisá las direcciones.';
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
    if (!terms) return setError('Tenés que aceptar los términos para continuar');
    if (!origin || !dest) return setError('Falta la ubicación');
    const dist = Math.round(distanceMeters);
    if (!Number.isFinite(dist) || dist <= 0) {
      return setError('No pudimos calcular la distancia. Volvé al paso de ubicación.');
    }
    const secs = routedSeconds ?? Math.round((dist / 1000 / 30) * 3600);
    setError(null);
    startTransition(async () => {
      const res = await createOrder({
        vehicle_id: useNew ? undefined : vehicleId ?? undefined,
        vehicle: useNew
          ? {
              brand: nv.brand,
              model: nv.model,
              year: /^\d{4}$/.test(nv.year.trim()) ? Number(nv.year.trim()) : undefined,
              patente: normalizePatente(nv.patente),
              gearbox: vType === 'moto' ? 'unknown' : nv.gearbox,
              has_keys: nv.has_keys,
            }
          : undefined,
        origin,
        dest,
        distance_meters: dist,
        duration_seconds: Number.isFinite(secs) ? secs : 0,
        dollys,
        wheels_blocked: wheels,
        conditions: { public_road: true, vehicle_type: vType },
        accepted_terms: true,
      });
      if (!res.ok) return setError(res.error ?? 'No pudimos crear la solicitud');
      router.push(`/cliente/solicitudes/${res.orderId}`);
    });
  }

  const brandListId = 'marcas-vehiculo';

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i <= step ? 'bg-brand-orange text-brand-ink' : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </span>
            <span className={`hidden sm:inline ${i === step ? 'font-medium' : 'text-muted-foreground'}`}>{label}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        {/* PASO 1 — VEHÍCULO */}
        {step === 0 && (
          <div className="space-y-4">
            {vehicles.length > 0 && !useNew && (
              <div className="space-y-2">
                <Label>Elegí tu vehículo</Label>
                {vehicles.map((v) => (
                  <label
                    key={v.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${
                      vehicleId === v.id ? 'border-brand-orange bg-brand-orange/10' : 'border-input'
                    }`}
                  >
                    <input type="radio" name="veh" className="accent-brand-orange" checked={vehicleId === v.id} onChange={() => setVehicleId(v.id)} />
                    <span>
                      <strong>{v.brand} {v.model}</strong> {v.year ?? ''} · {v.patente}
                    </span>
                  </label>
                ))}
                <button type="button" onClick={() => setUseNew(true)} className="w-full rounded-lg border border-dashed border-input p-3 text-left text-sm text-muted-foreground">
                  + Cargar otro vehículo
                </button>
              </div>
            )}

            {useNew && (
              <div className="space-y-4">
                {vehicles.length > 0 && (
                  <button type="button" onClick={() => setUseNew(false)} className="text-xs text-muted-foreground underline">
                    ← Usar un vehículo guardado
                  </button>
                )}

                {/* Tipo de vehículo */}
                <div>
                  <Label>¿Qué vas a remolcar?</Label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {([
                      { key: 'auto', label: 'Auto', icon: Car },
                      { key: 'moto', label: 'Moto', icon: Bike },
                    ] as const).map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setVType(t.key)}
                        className={`flex h-14 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${
                          vType === t.key ? 'border-brand-orange bg-brand-orange/10 text-brand-green' : 'border-input text-muted-foreground'
                        }`}
                      >
                        <t.icon className="h-5 w-5" /> {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="brand">Marca</Label>
                    <Input id="brand" list={brandListId} value={nv.brand} onChange={(e) => setNv({ ...nv, brand: e.target.value })} placeholder="Empezá a escribir…" />
                    <datalist id={brandListId}>
                      {brandsFor(vType).map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="model">Modelo</Label>
                    <Input id="model" value={nv.model} onChange={(e) => setNv({ ...nv, model: e.target.value })} placeholder={vType === 'moto' ? 'Ej: CG 150' : 'Ej: Gol'} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="year">Año</Label>
                    <Input id="year" inputMode="numeric" value={nv.year} onChange={(e) => setNv({ ...nv, year: e.target.value })} placeholder="Ej: 2016" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="patente">Patente</Label>
                    <Input id="patente" value={nv.patente} onChange={(e) => setNv({ ...nv, patente: e.target.value.toUpperCase() })} placeholder="AB123CD" />
                  </div>
                </div>

                {vType === 'auto' && (
                  <div>
                    <Label>Caja</Label>
                    <div className="mt-1.5 flex gap-2">
                      {(['manual', 'automatic', 'unknown'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setNv({ ...nv, gearbox: g })}
                          className={`h-11 flex-1 rounded-md border text-xs font-medium ${nv.gearbox === g ? 'border-brand-orange bg-brand-orange/10 text-brand-green' : 'border-input text-muted-foreground'}`}
                        >
                          {g === 'manual' ? 'Manual' : g === 'automatic' ? 'Automática' : 'No sé'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setNv({ ...nv, has_keys: !nv.has_keys })}
                  className={`flex w-full items-center gap-2 rounded-lg border p-3 text-sm ${nv.has_keys ? 'border-brand-orange bg-brand-orange/10 text-brand-green' : 'border-input text-muted-foreground'}`}
                >
                  <KeyRound className="h-4 w-4" /> {nv.has_keys ? 'Tengo las llaves' : 'No tengo las llaves'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* PASO 2 — UBICACIÓN */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-accent p-3 text-xs text-accent-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Por ahora operamos solo en AMBA. Usá tu ubicación, buscá la dirección o tocá el mapa.</p>
            </div>
            {geo ? (
              <LocationPicker
                origin={origin}
                dest={dest}
                onOrigin={setOrigin}
                onDest={setDest}
                onDistance={(m, s) => {
                  setRoutedMeters(m);
                  setRoutedSeconds(s);
                }}
              />
            ) : (
              <div className="space-y-3">
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
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>¿Necesita dollys?</Label>
                <p className="mb-1.5 text-xs text-muted-foreground">Carritos para ruedas que no giran.</p>
                <div className="flex gap-2">
                  {[0, 1, 2].map((n) => (
                    <button key={n} type="button" onClick={() => setDollys(n)} className={`h-11 flex-1 rounded-md border text-sm ${dollys === n ? 'border-brand-orange bg-brand-orange/10 text-brand-green' : 'border-input text-muted-foreground'}`}>
                      {n === 0 ? 'No' : n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Ruedas bloqueadas/faltantes</Label>
                <p className="mb-1.5 text-xs text-muted-foreground">Si no estás seguro, dejá 0.</p>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4].map((n) => (
                    <button key={n} type="button" onClick={() => setWheels(n)} className={`h-11 flex-1 rounded-md border text-sm ${wheels === n ? 'border-brand-orange bg-brand-orange/10 text-brand-green' : 'border-input text-muted-foreground'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASO 3 — PRESUPUESTO */}
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
              Acepto los términos y el presupuesto. Entiendo que primero una grúa acepta y después pago el anticipo.
            </label>
          </div>
        )}

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}
      </div>

      {/* Navegación — fija abajo en mobile para el pulgar */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
          Atrás
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next} size="lg">Continuar</Button>
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
