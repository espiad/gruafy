import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthForm } from '@/features/auth/auth-form';

export const metadata: Metadata = { title: 'Registrate' };

export default function RegistroPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Creá tu cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rápido y sin vueltas. Vas a poder pedir una grúa en minutos.
        </p>
      </div>
      <Suspense fallback={<div className="h-80" />}>
        <AuthForm mode="signup" />
      </Suspense>
      <p className="rounded-lg bg-accent p-3 text-center text-sm text-accent-foreground">
        ¿Tenés una grúa?{' '}
        <Link href="/registro/proveedor" className="font-semibold underline">
          Registrala como proveedor
        </Link>
      </p>
    </div>
  );
}
