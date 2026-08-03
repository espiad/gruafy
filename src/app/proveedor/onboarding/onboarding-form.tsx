'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createProviderAccount } from '@/features/providers/actions';
import { isValidCuit } from '@/lib/validation/argentina';

export function OnboardingForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const cuit = String(f.get('cuit'));
    if (!isValidCuit(cuit)) return setError('El CUIT no es válido (11 dígitos, dígito verificador).');

    start(async () => {
      const res = await createProviderAccount({
        legal_name: String(f.get('legal_name')),
        cuit,
        contact_email: String(f.get('contact_email') ?? ''),
        contact_phone: String(f.get('contact_phone')),
        truck: {
          patente: String(f.get('patente')),
          brand: String(f.get('brand') ?? ''),
          model: String(f.get('model') ?? ''),
          year: f.get('year') ? Number(f.get('year')) : undefined,
          capacity: String(f.get('capacity') ?? ''),
        },
      });
      if (res.ok) router.push('/proveedor/estado-solicitud');
      else setError(res.error ?? 'No pudimos crear la cuenta');
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <legend className="px-1 text-sm font-semibold">Datos de la empresa</legend>
        <div className="space-y-1.5">
          <Label htmlFor="legal_name">Razón social</Label>
          <Input id="legal_name" name="legal_name" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cuit">CUIT</Label>
            <Input id="cuit" name="cuit" required placeholder="30-12345678-9" inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_phone">Teléfono</Label>
            <Input id="contact_phone" name="contact_phone" required type="tel" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact_email">Email de contacto</Label>
          <Input id="contact_email" name="contact_email" type="email" />
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <legend className="px-1 text-sm font-semibold">Datos de la grúa</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="patente">Patente</Label>
            <Input id="patente" name="patente" required placeholder="AB123CD" onChange={(e) => (e.target.value = e.target.value.toUpperCase())} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="year">Año</Label>
            <Input id="year" name="year" inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand">Marca</Label>
            <Input id="brand" name="brand" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model">Modelo</Label>
            <Input id="model" name="model" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="capacity">Capacidad / observaciones</Label>
          <Input id="capacity" name="capacity" placeholder="Ej: hasta 3.500 kg, plancha" />
        </div>
      </fieldset>

      {error && (
        <p className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Continuar a la documentación
      </Button>
    </form>
  );
}
