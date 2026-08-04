import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '/como-funciona', label: 'Cómo funciona' },
  { href: '/simulador', label: 'Simulá tu costo' },
  { href: '/ayuda', label: 'Ayuda' },
  { href: '/proveedores', label: 'Sumá tu grúa' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-brand-cream/85 backdrop-blur supports-[backdrop-filter]:bg-brand-cream/70">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Inicio gruafy" className="focus-ring rounded-md">
          <Logo variant="green" />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring rounded-md px-3 py-2 text-sm font-medium text-brand-green/80 hover:text-brand-green"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/ingresar">Ingresar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/registro">Registrate</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
