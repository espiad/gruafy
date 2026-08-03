import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthForm } from '@/features/auth/auth-form';

export const metadata: Metadata = { title: 'Ingresar' };

export default function IngresarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Ingresá a gruafy</h1>
        <p className="mt-1 text-sm text-muted-foreground">Bienvenido de vuelta.</p>
      </div>
      <Suspense fallback={<div className="h-64" />}>
        <AuthForm mode="signin" />
      </Suspense>
    </div>
  );
}
