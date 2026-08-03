import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { publicEnv } from '@/lib/env';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-brand-green/20 bg-brand-ink text-brand-cream">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <Logo variant="cream" />
          <p className="max-w-xs text-sm text-brand-cream/70">
            Donde nadie quiere estar, ahí está gruafy. Asistencia vial on-demand en AMBA.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-brand-orange">Producto</h3>
          <ul className="space-y-2 text-sm text-brand-cream/80">
            <li><Link href="/como-funciona" className="hover:text-brand-orange">Cómo funciona</Link></li>
            <li><Link href="/simulador" className="hover:text-brand-orange">Simulá tu costo</Link></li>
            <li><Link href="/registro/proveedor" className="hover:text-brand-orange">Sumá tu grúa</Link></li>
            <li><Link href="/ayuda" className="hover:text-brand-orange">Centro de ayuda</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-brand-orange">Legales</h3>
          <ul className="space-y-2 text-sm text-brand-cream/80">
            <li><Link href="/legal/terminos-clientes" className="hover:text-brand-orange">Términos clientes</Link></li>
            <li><Link href="/legal/terminos-proveedores" className="hover:text-brand-orange">Términos proveedores</Link></li>
            <li><Link href="/legal/privacidad" className="hover:text-brand-orange">Privacidad</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-brand-orange">Contacto</h3>
          <ul className="space-y-2 text-sm text-brand-cream/80">
            {publicEnv.supportEmail && (
              <li><a href={`mailto:${publicEnv.supportEmail}`} className="hover:text-brand-orange">{publicEnv.supportEmail}</a></li>
            )}
            {publicEnv.whatsapp && (
              <li>
                <a href={`https://wa.me/${publicEnv.whatsapp}`} className="hover:text-brand-orange">WhatsApp</a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-brand-cream/10">
        <div className="container flex flex-col gap-1 py-5 text-xs text-brand-cream/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {publicEnv.legal.name}. gruafy actúa como intermediario tecnológico.</p>
          <p>{publicEnv.legal.cuit ? `CUIT ${publicEnv.legal.cuit} · ` : ''}{publicEnv.legal.address}</p>
        </div>
      </div>
    </footer>
  );
}
