import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Cómo funciona' };

const CLIENT_STEPS = [
  ['Contanos qué pasó', 'Elegís tu vehículo (marca, modelo, caja, si tenés llaves) y aclarás si hace falta dolly. Podés poner "No lo sé" donde no estés seguro.'],
  ['Marcá origen y destino', 'Damos tu ubicación actual (punto A) y a dónde querés llevar el vehículo (punto B). Mostramos la ruta y la distancia.'],
  ['Mirá el presupuesto', 'Ves el desglose completo: movida base, kilómetros, dollys, lo que pagás ahora y lo que pagás después al gruero.'],
  ['Una grúa acepta', 'Buscamos grúas cercanas y verificadas. La primera que acepta queda reservada para vos.'],
  ['Pagás el anticipo', 'Recién ahí pagás por Mercado Pago el 20% de anticipo. El pago habilita el inicio y te muestra los datos del gruero.'],
  ['Seguí en vivo y resolvé', 'Ves la grúa en el mapa y los estados en tiempo real. Al finalizar, pagás el saldo directo al gruero y dejás tu reseña.'],
];

const PROVIDER_STEPS = [
  ['Registrá tu grúa', 'Cargás empresa, grúa y conductores con su documentación. Una cuenta = una grúa habilitada.'],
  ['Te aprobamos a mano', 'Un administrador revisa cada documento. Cuando está todo OK, quedás habilitado para operar.'],
  ['Ponete disponible', 'Con un botón te marcás disponible y compartís tu ubicación mientras la web está activa.'],
  ['Aceptá pedidos', 'Recibís pedidos cercanos con 60 segundos para decidir. Ves el vehículo, las condiciones y cuánto cobrás.'],
  ['Hacé el servicio', 'Cuando el cliente paga, ves el origen exacto y su contacto. Avanzás los estados y cargás adicionales si hace falta.'],
  ['Cobrá', 'gruafy cobró el anticipo; el saldo del servicio lo cobrás directo al cliente al finalizar.'],
];

function Steps({ title, steps, tone }: { title: string; steps: string[][]; tone: 'client' | 'provider' }) {
  return (
    <section className="py-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <ol className="mt-6 space-y-4">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-4 rounded-xl border border-border bg-card p-5">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm ${
                tone === 'client' ? 'bg-brand-orange text-brand-ink' : 'bg-brand-green text-brand-cream'
              }`}
            >
              {i + 1}
            </span>
            <div>
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function ComoFuncionaPage() {
  return (
    <div className="container max-w-3xl py-14">
      <h1 className="font-display text-3xl md:text-4xl">Cómo funciona gruafy</h1>
      <p className="mt-3 text-muted-foreground">
        Como Uber, pero con grúas. Sin letra chica y con precio claro antes de aceptar.
      </p>
      <div className="mt-8 space-y-10">
        <Steps title="Si te quedaste varado" steps={CLIENT_STEPS} tone="client" />
        <Steps title="Si tenés una grúa" steps={PROVIDER_STEPS} tone="provider" />
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild size="lg"><Link href="/simulador">Simulá tu costo</Link></Button>
        <Button asChild size="lg" variant="outline"><Link href="/registro/proveedor">Sumá tu grúa</Link></Button>
      </div>
    </div>
  );
}
