import type { Metadata } from 'next';
import Link from 'next/link';
import { publicEnv } from '@/lib/env';
import { SUPPORT_ARTICLES } from '@/features/support/articles';
import { AyudaSearch } from './ayuda-search';

export const metadata: Metadata = { title: 'Centro de ayuda' };

export default function AyudaPage() {
  return (
    <div className="container max-w-4xl py-14">
      <h1 className="font-display text-3xl md:text-4xl">Centro de ayuda</h1>
      <p className="mt-3 text-muted-foreground">
        Tutoriales y preguntas frecuentes para clientes y grúas.
      </p>
      <div className="mt-8">
        <AyudaSearch articles={SUPPORT_ARTICLES} />
      </div>
      {publicEnv.whatsapp && (
        <div className="mt-10 flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">¿No lo encontraste?</h2>
            <p className="text-sm text-muted-foreground">Escribinos y te damos una mano.</p>
          </div>
          <Link
            href={`https://wa.me/${publicEnv.whatsapp}`}
            className="focus-ring inline-flex h-11 items-center rounded-md bg-brand-green px-5 text-sm font-semibold text-brand-cream"
          >
            Escribir por WhatsApp
          </Link>
        </div>
      )}
    </div>
  );
}
