import Link from 'next/link';
import { MapPin, Radar, CheckCircle2, ShieldCheck, Eye, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GruafyMark } from '@/components/brand/logo';

const STEPS = [
  { icon: MapPin, title: 'Pedí', text: 'Marcá dónde estás y a dónde vas. Ves el precio antes de aceptar.' },
  { icon: Radar, title: 'Rastreá', text: 'Una grúa acepta y la seguís en vivo en el mapa. Sabés quién viene y cuándo llega.' },
  { icon: CheckCircle2, title: 'Pagas', text: 'Cuando termina el auxilio, cancelas el total pendiente. Solo pagas un pequeño porcentaje para comenzar.' },
];

const ADVANTAGES = [
  { icon: Clock, title: 'Rapidez', text: 'Sin call center prehistórico ni esperas eternas. Pedís desde el celu y listo.' },
  { icon: Eye, title: 'Claridad', text: 'Precio y desglose visibles antes de aceptar. Sin letra chica ni sorpresas.' },
  { icon: Radar, title: 'Tracking en vivo', text: 'Lo ves venir y te calmás. Ubicación en tiempo real durante todo el servicio.' },
  { icon: ShieldCheck, title: 'Grúas verificadas', text: 'Cada proveedor y su documentación se validan a mano antes de operar.' },
];

const FAQ = [
  { q: '¿Cuándo pago?', a: 'Primero una grúa acepta el viaje. Recién ahí pagás por Mercado Pago el anticipo de gruafy (20% del subtotal estimado) más el costo de procesamiento de la pasarela de pago. El resto se lo pagás directo al gruero cuando termina.' },
  { q: '¿Qué incluye el precio?', a: 'La movida base, los kilómetros de la ruta y los dollys que hagan falta. No incluye peajes ni esperas: esos se avisan y se suman como adicionales al final.' },
  { q: '¿En qué zona operan?', a: 'Únicamente en el AMBA. La proyección 2026 es una cobertura total del AMBA' },
  { q: '¿Puedo ir con la grúa?', a: 'Sí, hasta 2 personas viajan con el vehículo. Si necesitás transporte para más gente, se pide aparte.' },
];

export default function LandingPage() {
  return (
    <>
      {/* HERO — naranja pleno para máxima legibilidad */}
      <section className="relative overflow-hidden bg-brand-orange text-brand-ink">
        <div className="container relative grid items-center gap-10 py-20 md:grid-cols-2 md:py-28">
          <div className="space-y-6 animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-ink px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-cream">
              Como Uber, pero con grúas
            </span>
            <h1 className="font-display text-4xl leading-[1.05] sm:text-5xl md:text-6xl">
              Donde nadie quiere estar, ahí está gruafy.
            </h1>
            <p className="max-w-md text-lg text-brand-ink/80">
              Pedí una grúa desde el celu y seguila en vivo.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link href="/cliente/solicitar">Pedir una grúa<ArrowRight /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-brand-ink/30">
                <Link href="/simulador">Simulá tu costo</Link>
              </Button>
            </div>
            <p className="text-sm text-brand-ink/70">Sin esperas eternas. Pagas cuando llega la grua.</p>
          </div>
          <div className="relative hidden justify-center md:flex">
            <div className="flex h-72 w-72 items-center justify-center rounded-[2rem] bg-brand-ink shadow-2xl">
              <GruafyMark className="h-40 w-auto text-brand-orange" />
            </div>
          </div>
        </div>
      </section>

      {/* PASOS */}
      <section className="container py-20">
        <h2 className="text-center text-3xl font-semibold">Tu auxilio en tres pasos</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
          Pensado para el momento de estrés: encontramos tu grua en 5'.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-border bg-card p-7 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-orange/15 text-brand-green">
                <s.icon className="h-6 w-6" />
              </div>
              <span className="absolute right-6 top-6 font-display text-2xl text-brand-orange/40">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VENTAJAS */}
      <section className="bg-brand-green py-20 text-brand-cream">
        <div className="container">
          <h2 className="text-3xl font-semibold">Por qué gruafy</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ADVANTAGES.map((a) => (
              <div key={a.title} className="rounded-2xl bg-brand-cream/5 p-6 ring-1 ring-brand-cream/10">
                <a.icon className="h-7 w-7 text-brand-orange" />
                <h3 className="mt-4 text-lg font-semibold">{a.title}</h3>
                <p className="mt-1 text-sm text-brand-cream/75">{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SIMULADOR */}
      <section className="container py-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand-ink px-8 py-14 text-center text-brand-cream md:px-16">
          <div className="brand-bars pointer-events-none absolute inset-x-0 bottom-0 h-16 opacity-20" aria-hidden />
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold md:text-4xl">
            ¿Cuánto te sale un acarreo?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-cream/75">
            Averigualo en 30 segundos y sin registrarte.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/simulador">Simular costo ahora <ArrowRight /></Link>
          </Button>
        </div>
      </section>

      {/* FAQ */}
      <section className="container pb-24">
        <h2 className="text-center text-3xl font-semibold">Preguntas frecuentes</h2>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-border rounded-2xl border border-border bg-card">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between rounded-md text-lg font-medium">
                {f.q}
                <ArrowRight className="h-5 w-5 text-brand-orange transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
