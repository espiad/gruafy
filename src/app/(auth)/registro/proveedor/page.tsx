import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import { AuthForm } from '@/features/auth/auth-form';

export const metadata: Metadata = { title: 'Sumá tu grúa' };

const PERKS = [
  'Recibí pedidos cercanos sin depender de aseguradoras.',
  'Cobrás el saldo directo al cliente al finalizar.',
  'Una cuenta = una grúa. Hasta 5 conductores.',
];

export default function RegistroProveedorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Sumá tu grúa a gruafy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Creá la cuenta y después cargás la documentación. Un administrador la revisa antes de
          habilitarte.
        </p>
      </div>
      <ul className="space-y-2">
        {PERKS.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-foreground/90">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" /> {p}
          </li>
        ))}
      </ul>
      <Suspense fallback={<div className="h-80" />}>
        <AuthForm mode="signup" provider />
      </Suspense>
    </div>
  );
}
