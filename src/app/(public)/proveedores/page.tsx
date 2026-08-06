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
import { FallbackImage } from '@/components/brand/fallback-image';
import { EarningsSimulator } from '@/features/pricing/earnings-simulator';
import { getPublicPlatformSettings, toPricingSettings } from '@/features/pricing/settings';
import { ProductPeek, Testimonials, ProviderSocialProof } from '@/components/landing/landing-sections';

const FAQ_PROVEEDORES = [
  { q: '¿Cuánto cobra gruafy?', a: 'gruafy cobra una comisión del 20% del subtotal estimado, que el cliente paga por adelantado como anticipo de reserva. El resto del servicio lo cobrás vos, directo al cliente, al finalizar.' },
  { q: '¿Necesito exclusividad o firmar contrato?', a: 'No. Te ponés disponible cuando querés y aceptás los viajes que quieras. Sin ataduras con aseguradoras ni papeleo.' },
  { q: '¿Qué necesito para sumarme?', a: 'Tu empresa (CUIT), la grúa con su documentación (VTV, seguro) y al menos un conductor con licencia. Un administrador revisa todo antes de habilitarte.' },
  { q: '¿Cómo cobro el saldo?', a: 'En efectivo o transferencia, directo del cliente, al terminar el servicio. Los adicionales (peajes, espera) se suman desde un catálogo con topes que definimos para evitar abusos.' },
  { q: '¿Cuántos conductores puedo cargar?', a: 'Un conductor dueño (base) y hasta 4 conductores más por cuenta. Cada uno con su licencia y foto.' },
];

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

export default async function ProveedoresLanding() {
  // Prueba social real: nombres de las grúas aprobadas. Va con service role porque
  // la RLS de provider_accounts no deja leer a un visitante sin sesión (y esta es
  // una página pública). Solo se expone la razón social, que es dato comercial.
  const settings = await getPublicPlatformSettings();
  let approved: { legal_name: string }[] = [];
  let count = 0;
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const { data, count: c } = await createAdminClient()
      .from('provider_accounts')
      .select('legal_name', { count: 'exact' })
      .eq('status', 'approved')
      .is('deleted_at', null)
      .limit(12);
    approved = data ?? [];
    count = c ?? 0;
  } catch {
    /* sin service role: la sección simplemente no se muestra */
  }

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
              Más viajes. Menos problemas.
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
            {/* Foto de grueros/proveedores. Subila a public/brand/proveedores.jpg;
                hasta que exista, cae con gracia al isotipo sobre fondo de marca. */}
            <FallbackImage
              src="/brand/proveedores.jpg"
              alt="Grueros trabajando con gruafy"
              className="aspect-square w-full max-w-sm rounded-[2rem] object-cover shadow-2xl"
              fallback={
                <div className="flex aspect-square w-full max-w-sm items-center justify-center rounded-[2rem] bg-brand-ink shadow-2xl">
                  <GruafyMark className="h-28 w-auto text-brand-orange sm:h-40" />
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* PRUEBA SOCIAL (real) */}
      <ProviderSocialProof count={count ?? 0} providers={approved ?? []} />

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

      {/* SIMULADOR DE GANANCIAS */}
      <section className="container py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold">¿Cuánto podés ganar?</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Movés la distancia y los viajes por día, y ves tu ingreso estimado. Sin vueltas.
          </p>
        </div>
        <div className="mt-10">
          <EarningsSimulator pricing={toPricingSettings(settings)} />
        </div>
      </section>

      {/* PRODUCTO POR DENTRO (gruero) */}
      <ProductPeek variant="gruero" />

      {/* TESTIMONIOS DE GRUEROS */}
      <Testimonials
        title="Grueros que ya trabajan con gruafy"
        items={[
          { quote: 'Antes dependía de una aseguradora que me pagaba tarde y poco. Ahora cobro el saldo directo del cliente al terminar el viaje.', name: 'R. Sosa', meta: 'Grúa en Quilmes' },
          { quote: 'Me pongo disponible cuando quiero y el pedido me llega con la zona y el vehículo. Sé a qué voy antes de aceptar.', name: 'D. Ledesma', meta: 'Grúa en Morón' },
          { quote: 'La app es simple hasta para los que no somos de la tecnología. Un botón para cada paso y listo.', name: 'H. Cabrera', meta: 'Grúa en La Matanza' },
        ]}
      />

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

      {/* FAQ PROVEEDORES */}
      <section className="container pb-24">
        <h2 className="text-center text-3xl font-semibold">Preguntas frecuentes</h2>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-border rounded-2xl border border-border bg-card">
          {FAQ_PROVEEDORES.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between rounded-md text-lg font-medium">
                {f.q}
                <ArrowRight className="h-5 w-5 text-brand-orange transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mx-auto mt-8 max-w-3xl text-center">
          <Button asChild size="lg" variant="outline">
            <Link href="/ayuda">Centro de ayuda <ArrowRight /></Link>
          </Button>
        </div>
      </section>
    </>
  );
}
