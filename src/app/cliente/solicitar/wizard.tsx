'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, Info, Car, Bike, KeyRound, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LocationPicker } from '@/components/maps/location-picker-lazy';
import { QuoteBreakdownCard } from '@/features/pricing/quote-breakdown';
import { quote, type PricingSettings } from '@/features/pricing/pricing';
import { hasGeoapify, type GeoPoint } from '@/lib/geoapify';
import { normalizePatente, isValidPatente } from '@/lib/validation/argentina';
import { brandsFor, type VehicleType } from '@/features/orders/vehicle-data';
import { createOrder, uploadSituationPhoto, startSearch } from '@/features/orders/actions';

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
  const [nv, setNv] = useState({ brand: '', model: '', year: '', patente: '', gearbox: 'unknown' as VehicleLite['gearbox'], has_keys: true, color: '' });

  // Foto de la situación (cámara en el momento, comprimida)
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    setError(null);
    try {
      const { compressImage } = await import('@/lib/image/compress');
      const blob = await compressImage(file, 1280, 0.7);
      setPhoto(blob);
      setPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch {
      setError('No pudimos procesar la foto. Probá de nuevo.');
    } finally {
      setPhotoBusy(false);
    }
  }

  // Paso 2 — ubicación
  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  const [dest, setDest] = useState<GeoPoint | null>(null);
  const [routedMeters, setRoutedMeters] = useState<number | null>(null);
  const [routedSeconds, setRoutedSeconds] = useState<number | null>(null);
  const [manualKm, setManualKm] = useState(10);

  // Paso 3 — condiciones
  const [dollys, setDollys] = useState(0);
  const [wheels, setWheels] = useState(0);
  const [wheelState, setWheelState] = useState<'yes' | 'no' | 'unsure' | null>(null);
  const [dollyHelp, setDollyHelp] = useState(false);
  const [terms, setTerms] = useState(false);
  const [declared, setDeclared] = useState(false);

  // Traduce la respuesta simple del usuario a dollys/ruedas para el presupuesto.
  function setWheels_(state: 'yes' | 'no' | 'unsure') {
    setWheelState(state);
    if (state === 'yes' || state === 'unsure') {
      setWheels(0);
      setDollys(0);
    }
  }
  // Ruedas que puede tener trabadas según el vehículo.
  const maxRuedas = vType === 'moto' ? 2 : 4;

  /**
   * Al cambiar de auto a moto hay que recortar la cantidad de ruedas trabadas: si
   * no, quedaba un "4" elegido con el selector ya mostrando solo 1 y 2, y el
   * presupuesto seguía cobrando dos dollys.
   */
  function cambiarTipo(t: VehicleType) {
    setVType(t);
    const tope = t === 'moto' ? 2 : 4;
    if (wheels > tope) setBlockedCount(tope);
  }

  function setBlockedCount(n: number) {
    setWheels(n);
    setDollys(n <= 0 ? 0 : n <= 2 ? 1 : 2);
  }

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
      if (!photo) return 'Sacá una foto de cómo está el vehículo para continuar';
    }
    if (step === 1) {
      if (!origin || !dest) return 'Marcá el origen y el destino';
      if (geo && !(routedMeters && routedMeters > 0)) {
        return 'Esperá a que calculemos la ruta, o revisá las direcciones.';
      }
      // El estado de las ruedas define si hace falta dolly, y el dolly cambia el
      // precio. Sin responder, el presupuesto sale mal y el gruero llega sin el
      // equipo que necesita.
      if (!wheelState) return 'Decinos si las ruedas del vehículo giran';
      if (wheelState === 'no' && wheels < 1) return 'Elegí cuántas ruedas no giran';
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
    if (!declared) return setError('Confirmá la declaración para continuar');
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
              color: nv.color.trim() || undefined,
            }
          : undefined,
        origin,
        dest,
        distance_meters: dist,
        duration_seconds: Number.isFinite(secs) ? secs : 0,
        dollys,
        wheels_blocked: wheels,
        conditions: { public_road: true, vehicle_type: vType, wheels_unsure: wheelState === 'unsure' },
        accepted_terms: true,
      });
      if (!res.ok || !res.orderId) return setError(res.error ?? 'No pudimos crear la solicitud');
      // Subimos la foto ANTES de difundir el pedido, para que los grueros ya la vean.
      if (photo) {
        try {
          const fd = new FormData();
          fd.append('photo', photo, 'situacion.jpg');
          await uploadSituationPhoto(res.orderId, fd);
        } catch {
          /* la foto es complementaria; seguimos igual */
        }
      }
      // Recién ahora difundimos el pedido a los grueros.
      await startSearch(res.orderId);
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
                        onClick={() => cambiarTipo(t.key)}
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

                <div>
                  <Label>Color</Label>
                  <p className="mb-1.5 text-xs text-muted-foreground">Ayuda al gruero a identificarte más rápido.</p>
                  <div className="flex flex-wrap gap-2">
                    {['Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul'].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setNv({ ...nv, color: col })}
                        className={`h-10 rounded-md border px-3 text-sm ${nv.color === col ? 'border-brand-orange bg-brand-orange/10 text-brand-green' : 'border-input text-muted-foreground'}`}
                      >
                        {col}
                      </button>
                    ))}
                    <Input
                      value={['Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul'].includes(nv.color) ? '' : nv.color}
                      onChange={(e) => setNv({ ...nv, color: e.target.value })}
                      placeholder="Otro…"
                      className="h-10 w-28"
                    />
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

            {/* Foto de la situación: SOLO cámara en el momento (no galería), para
                evitar fotos falsas. Se comprime en el celu antes de subir. */}
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Foto de la situación</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sacá una foto de cómo quedó el vehículo (dónde está, si hay algo alrededor). La ve la
                grúa antes de aceptar. Tiene que ser una foto del momento.
              </p>
              {photoPreview ? (
                <div className="mt-2 space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Situación del vehículo" className="max-h-48 w-full rounded-lg object-cover" />
                  <label className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
                    <Camera className="h-4 w-4" /> Sacar otra
                    <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
                  </label>
                </div>
              ) : (
                <label className="focus-ring mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-4 text-sm font-medium hover:bg-accent">
                  {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {photoBusy ? 'Procesando…' : 'Sacar foto con la cámara'}
                  <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={photoBusy} onChange={(e) => onPhoto(e.target.files?.[0])} />
                </label>
              )}
            </div>
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

            <div className="space-y-3">
              <Label>¿Las ruedas del vehículo giran?</Label>
              <p className="text-xs text-muted-foreground">Ruedas trabadas, pinchadas o sin rueda necesitan un equipo especial.</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  { key: 'yes', label: 'Sí, giran todas', emoji: '👍' },
                  { key: 'no', label: 'No, alguna no gira', emoji: '⚠️' },
                  { key: 'unsure', label: 'No estoy seguro', emoji: '🤔' },
                ] as const).map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setWheels_(o.key)}
                    className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-medium sm:text-sm ${
                      wheelState === o.key ? 'border-brand-orange bg-brand-orange/10 text-brand-green' : 'border-input text-muted-foreground'
                    }`}
                  >
                    <span className="text-base">{o.emoji}</span> {o.label}
                  </button>
                ))}
              </div>

              {wheelState === 'no' && (
                <div className="space-y-2 rounded-xl border border-brand-orange/40 bg-brand-orange/5 p-3">
                  <p className="text-sm font-medium">¿Cuántas ruedas no giran?</p>
                  <div className="flex gap-2">
                    {/* Una moto tiene DOS ruedas: ofrecer 3 y 4 era un absurdo que
                        además cotizaba dollys de más. */}
                    {[1, 2, 3, 4].slice(0, maxRuedas).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setBlockedCount(n)}
                        className={`h-11 flex-1 rounded-md border text-sm ${wheels === n ? 'border-brand-orange bg-brand-orange/20 text-brand-green' : 'border-input text-muted-foreground'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setDollyHelp((v) => !v)} className="text-xs text-brand-green underline">
                    ¿Por qué cambia el precio?
                  </button>
                  {dollyHelp && (
                    <p className="text-xs text-muted-foreground">
                      Para llevar un vehículo con ruedas que no giran usamos un <strong>dolly</strong>: un
                      carrito que las levanta. Por eso puede sumar al presupuesto.
                    </p>
                  )}
                </div>
              )}

              {wheelState === 'unsure' && (
                <p className="rounded-lg bg-accent p-3 text-xs text-accent-foreground">
                  No hay problema. Presupuestamos sin equipo extra; si al llegar el gruero ve que hace
                  falta, se suma al final y te lo avisa antes.
                </p>
              )}
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
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brand-orange" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              <span>
                Acepto los <a href="/legal/terminos-clientes" target="_blank" className="underline">términos</a> y el presupuesto. Entiendo que primero una grúa acepta y después pago el anticipo.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brand-orange" checked={declared} onChange={(e) => setDeclared(e.target.checked)} />
              <span>
                Declaro que los datos son verídicos y que solicito el servicio de buena fe, resguardando la seguridad de quien me asiste.
              </span>
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
        {/* "Continuar" queda bloqueado mientras se comprime la foto: si no, tocarlo
            justo en ese momento te decía "sacá una foto" recién sacada. */}
        {step < STEPS.length - 1 ? (
          <Button onClick={next} size="lg" disabled={photoBusy}>
            {photoBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            {photoBusy ? 'Procesando foto…' : 'Continuar'}
          </Button>
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
