import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      {/* Panel de marca (oculto en mobile) */}
      <div className="relative hidden overflow-hidden bg-brand-ink text-brand-cream md:flex md:flex-col md:justify-between md:p-12">
        <div className="brand-bars pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-20" aria-hidden />
        <Link href="/" className="focus-ring w-fit rounded-md">
          <Logo variant="cream" />
        </Link>
        <div className="relative">
          <h2 className="font-display text-3xl leading-tight">
            Donde nadie quiere estar, ahí está gruafy.
          </h2>
          <p className="mt-4 max-w-sm text-brand-cream/70">
            Pedí una grúa, seguila en vivo y resolvé sin vueltas. Sin letra chica.
          </p>
        </div>
        <p className="relative text-sm text-brand-cream/50">Asistencia vial on-demand · AMBA</p>
      </div>

      {/* Formulario */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="focus-ring mb-8 inline-block rounded-md md:hidden">
            <Logo variant="green" />
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
