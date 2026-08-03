'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2, Building2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OnboardingProgress } from '@/features/providers/onboarding-progress';
import { createProviderAccount } from '@/features/providers/actions';
import { isValidCuit, formatCuitInput, isValidPatente, normalizePatente } from '@/lib/validation/argentina';
import { cn } from '@/lib/utils';

export function OnboardingForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  const [legalName, setLegalName] = useState('');
  const [cuit, setCuit] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [patente, setPatente] = useState('');
  const [year, setYear] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [capacity, setCapacity] = useState('');

  const cuitValid = isValidCuit(cuit);
  const cuitTouched = cuit.replace(/\D/g, '').length >= 11;
  const patenteValid = isValidPatente(patente);
  const patenteTouched = patente.length >= 6;

  function goToTruck() {
    setError(null);
    if (!legalName.trim()) return setError('Ingresá la razón social.');
    if (!cuitValid) return setError('Revisá el CUIT: son 11 dígitos con dígito verificador.');
    if (phone.trim().length < 6) return setError('Ingresá un teléfono de contacto.');
    setStep(2);
  }

  function submit() {
    setError(null);
    if (!patenteValid) return setError('Revisá la patente de la grúa (formato AB123CD o AAA123).');
    start(async () => {
      const res = await createProviderAccount({
        legal_name: legalName.trim(),
        cuit,
        contact_email: email.trim(),
        contact_phone: phone.trim(),
        truck: {
          patente: normalizePatente(patente),
          brand: brand.trim(),
          model: model.trim(),
          year: year ? Number(year) : undefined,
          capacity: capacity.trim(),
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
              <Label htmlFor="contact_phone">Teléfono</Label>
              <Input id="contact_phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="11 5555 5555" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_email">Email de contacto (opcional)</Label>
            <Input id="contact_email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="contacto@empresa.com" />
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

      {error && (
        <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep(1)} disabled={step === 1 || pending}>
          Atrás
        </Button>
        {step === 1 ? (
          <Button onClick={goToTruck} size="lg">Continuar</Button>
        ) : (
          <Button onClick={submit} size="lg" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Continuar a documentos
          </Button>
        )}
      </div>
    </div>
  );
}
