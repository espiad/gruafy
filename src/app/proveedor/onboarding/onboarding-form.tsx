'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2, Building2, Truck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OnboardingProgress } from '@/features/providers/onboarding-progress';
import { createProviderAccount } from '@/features/providers/actions';
import { isValidCuit, formatCuitInput, isValidPatente, normalizePatente, isValidDni } from '@/lib/validation/argentina';
import { cn } from '@/lib/utils';

export function OnboardingForm({
  ownerName,
  ownerPhone,
  ownerEmail,
}: {
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [legalName, setLegalName] = useState('');
  const [cuit, setCuit] = useState('');
  // El teléfono de contacto arranca con el que el dueño ya cargó al registrarse:
  // es el número al que lo llaman clientes y soporte. Editable por si usa otra línea.
  const [phone, setPhone] = useState(ownerPhone);
  const [patente, setPatente] = useState('');
  const [year, setYear] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [capacity, setCapacity] = useState('');
  // Conductor. Por defecto el dueño es el conductor (el caso más común), así que
  // precargamos su nombre y teléfono y solo pedimos el DNI, que es el dato nuevo.
  const [soyElConductor, setSoyElConductor] = useState(true);
  const [driverName, setDriverName] = useState(ownerName);
  const [driverDni, setDriverDni] = useState('');
  const [driverPhone, setDriverPhone] = useState(ownerPhone);

  /** Al marcar/desmarcar "soy yo", precargamos o limpiamos los datos del conductor. */
  function toggleSoyConductor(mine: boolean) {
    setSoyElConductor(mine);
    setDriverName(mine ? ownerName : '');
    setDriverPhone(mine ? ownerPhone : '');
    setDriverDni('');
  }

  const cuitValid = isValidCuit(cuit);
  const cuitTouched = cuit.replace(/\D/g, '').length >= 11;
  const patenteValid = isValidPatente(patente);
  const patenteTouched = patente.length >= 6;
  const dniValid = !driverDni || isValidDni(driverDni);
  const dniTouched = driverDni.replace(/\D/g, '').length >= 7;

  function goToTruck() {
    setError(null);
    if (!legalName.trim()) return setError('Ingresá la razón social.');
    if (!cuitValid) return setError('Revisá el CUIT: son 11 dígitos con dígito verificador.');
    if (phone.trim().length < 6) return setError('Ingresá un teléfono de contacto.');
    setStep(2);
  }

  function goToDriver() {
    setError(null);
    if (!patenteValid) return setError('Revisá la patente de la grúa (formato AB123CD o AAA123).');
    setStep(3);
  }

  function submit() {
    setError(null);
    if (driverName.trim().length < 2) return setError('Ingresá el nombre del conductor.');
    if (driverDni && !isValidDni(driverDni)) return setError('Revisá el DNI del conductor.');
    start(async () => {
      const res = await createProviderAccount({
        legal_name: legalName.trim(),
        cuit,
        // El email de contacto de la empresa es, por defecto, el de la cuenta. No lo
        // volvemos a pedir; se edita después en el perfil si hace falta otro.
        contact_email: ownerEmail.trim(),
        contact_phone: phone.trim(),
        truck: {
          patente: normalizePatente(patente),
          brand: brand.trim(),
          model: model.trim(),
          year: year ? Number(year) : undefined,
          capacity: capacity.trim(),
        },
        driver: {
          full_name: driverName.trim(),
          dni: driverDni.trim() || undefined,
          phone: driverPhone.trim() || undefined,
        },
      });
      if (res.ok) router.push('/proveedor/estado-solicitud');
      else setError(res.error ?? 'No pudimos crear la cuenta');
    });
  }

  return (
    <div className="space-y-6">
      <OnboardingProgress current={step} />

      {step === 1 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2 text-brand-green">
            <Building2 className="h-5 w-5" />
            <h2 className="font-semibold">Datos de la empresa</h2>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="legal_name">Razón social</Label>
            <Input id="legal_name" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Ej: Grúas del Sur SRL" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cuit">CUIT</Label>
              <div className="relative">
                <Input
                  id="cuit"
                  value={cuit}
                  onChange={(e) => setCuit(formatCuitInput(e.target.value))}
                  placeholder="30-71659554-0"
                  inputMode="numeric"
                  className={cn(cuitTouched && (cuitValid ? 'border-success pr-9' : 'border-destructive pr-9'))}
                />
                {cuitTouched && cuitValid && <CheckCircle2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />}
              </div>
              <p className={cn('text-xs', cuitTouched && !cuitValid ? 'text-destructive' : 'text-muted-foreground')}>
                {cuitTouched && !cuitValid ? 'El dígito verificador no cierra. Revisalo.' : 'Con o sin guiones; los ponemos solos.'}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_phone">Teléfono de contacto</Label>
              <Input id="contact_phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="11 5555 5555" />
              <p className="text-xs text-muted-foreground">
                Es el número al que te van a llamar los clientes y soporte. Precargamos el de tu
                cuenta; cambialo si usás otra línea.
              </p>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2 text-brand-green">
            <Truck className="h-5 w-5" />
            <h2 className="font-semibold">Datos de la grúa</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="patente">Patente</Label>
              <div className="relative">
                <Input
                  id="patente"
                  value={patente}
                  onChange={(e) => setPatente(e.target.value.toUpperCase())}
                  placeholder="AB123CD"
                  className={cn(patenteTouched && (patenteValid ? 'border-success pr-9' : 'border-destructive pr-9'))}
                />
                {patenteTouched && patenteValid && <CheckCircle2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">Año</Label>
              <Input id="year" value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" placeholder="Ej: 2019" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej: Iveco" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ej: Daily" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capacity">Capacidad / observaciones (opcional)</Label>
            <Input id="capacity" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Ej: hasta 3.500 kg, plancha" />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2 text-brand-green">
            <User className="h-5 w-5" />
            <h2 className="font-semibold">Conductor</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Quién va a manejar esta grúa. Ahora sumás <strong>uno</strong>; cuando te aprueben, podés
            agregar hasta 4 más desde <strong>Conductores</strong>.
          </p>

          <label className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <input
              type="checkbox"
              checked={soyElConductor}
              onChange={(e) => toggleSoyConductor(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-brand-orange"
            />
            <span>Uno de los conductores de la grúa <strong>seré yo</strong></span>
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="driver_name">Nombre y apellido</Label>
            <Input
              id="driver_name"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Ej: Carlos Pérez"
              autoComplete="name"
              disabled={soyElConductor}
              className={soyElConductor ? 'bg-muted text-muted-foreground' : undefined}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="driver_dni">DNI</Label>
              <div className="relative">
                <Input
                  id="driver_dni"
                  value={driverDni}
                  onChange={(e) => setDriverDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  inputMode="numeric"
                  placeholder="Ej: 30111222"
                  className={cn(dniTouched && (dniValid ? 'border-success pr-9' : 'border-destructive pr-9'))}
                />
                {dniTouched && dniValid && <CheckCircle2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />}
              </div>
            </div>
            {/* El teléfono del conductor solo se pide si es OTRA persona. Si sos vos,
                ya es el de tu cuenta y no tiene sentido volver a pedirlo. */}
            {!soyElConductor && (
              <div className="space-y-1.5">
                <Label htmlFor="driver_phone">Teléfono del conductor</Label>
                <Input id="driver_phone" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} type="tel" placeholder="11 5555 5555" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">La licencia del conductor se sube en el paso de documentos.</p>
        </div>
      )}

      {error && (
        <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : 1))}
          disabled={step === 1 || pending}
        >
          Atrás
        </Button>
        {step === 1 && <Button onClick={goToTruck} size="lg">Continuar</Button>}
        {step === 2 && <Button onClick={goToDriver} size="lg">Continuar</Button>}
        {step === 3 && (
          <Button onClick={submit} size="lg" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Continuar a documentos
          </Button>
        )}
      </div>
    </div>
  );
}
