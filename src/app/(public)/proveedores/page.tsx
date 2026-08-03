import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Wallet,
  Bell,
  ShieldCheck,
  Clock,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GruafyMark } from '@/components/brand/logo';

export const metadata: Metadata = {
  title: 'Sumá tu grúa',
  description:
    'Recibí viajes de acarreo sin depender de aseguradoras. Cobrás directo, elegís cuándo trabajar y sumás clientes en AMBA con gruafy.',
};

const BENEFITS = [
  { icon: Wallet, title: 'Cobrás directo', text: 'El saldo del servicio te lo paga el cliente al finalizar. gruafy solo cobra su comisión por adelantado.' },
  { icon: Bell, title: 'Pedidos al instante', text: 'Cuando alguien necesita una grúa, te llega el pedido y tenés 2 minutos para aceptarlo. Vos decidís.' },
  { icon: Clock, title: 'Sin contratos ni exclusividad', text: 'Te ponés disponible cuando querés. Sin ataduras con aseguradoras ni papeleo eterno.' },
  { icon: ShieldCheck, title: 'Clientes verificados', text: 'Los pedidos vienen con datos del vehículo y del servicio. Sabés a qué vas antes de aceptar.' },
];

const STEPS = [
  ['Registrá tu grúa', 'Cargás empresa, grúa y conductor. Una cuenta = una grúa habilitada.'],
  ['Te aprobamos', 'Un administrador revisa tu documentación. Cuando está OK, quedás habilitado.'],
  ['Ponete disponible', 'Con un botón entrás en la red y empezás a recibir pedidos cercanos.'],
  ['Aceptá y cobrá', 'Aceptás el viaje, hacés el servicio y cobrás el saldo directo al cliente.'],
];

export default function ProveedoresLanding() {
  return (
    <>
      {/* HERO B2B — verde de marca */}
      <section className="relative overflow-hidden bg-brand-green text-brand-cream">
        <div className="container grid items-center gap-10 py-20 md:grid-cols-2 md:py-28">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-ink">
              Para grúas y proveedores
            </span>
            <h1 className="font-display text-4xl leading-[1.05] sm:text-5xl">
              Más viajes. Sin aseguradoras.
            </h1>
            <p className="max-w-md text-lg text-brand-cream/85">
              Sumá tu grúa a gruafy y recibí pedidos de acarreo en AMBA. Cobrás directo, elegís cuándo
              trabajar y no dependés de nadie.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/registro/proveedor">Sumar mi grúa <ArrowRight /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-brand-cream/30 text-brand-cream hover:bg-brand-cream/10">
                <Link href="/ingresar">Ya tengo cuenta</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <div className="flex aspect-square w-full max-w-sm items-center justify-center rounded-[2rem] bg-brand-ink shadow-2xl">
              <GruafyMark className="h-28 w-auto text-brand-orange sm:h-40" />
            </div>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="container py-20">
        <h2 className="text-center text-3xl font-semibold">Lo que ganás</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-orange/15 text-brand-green">
                <b.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{b.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CÓMO EMPEZAR */}
      <section className="bg-muted/40 py-20">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-semibold">Cómo empezar</h2>
          <ol className="mt-8 space-y-4">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="flex gap-4 rounded-xl border border-border bg-card p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green font-display text-sm text-brand-cream">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* COMISIÓN CLARA */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 text-center">
          <MapPin className="mx-auto h-8 w-8 text-brand-orange" />
          <h2 className="mt-3 text-2xl font-semibold">Reglas claras, sin letra chica</h2>
          <ul className="mx-auto mt-5 max-w-md space-y-3 text-left text-sm">
            <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" /> gruafy cobra al cliente un anticipo del 20% para reservarte el viaje.</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" /> El resto del servicio lo cobrás vos, directo al cliente, al finalizar.</li>
            <li className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" /> Una grúa admite un conductor dueño y hasta 4 conductores más.</li>
          </ul>
          <Button asChild size="lg" className="mt-8">
            <Link href="/registro/proveedor">Sumar mi grúa <ArrowRight /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
