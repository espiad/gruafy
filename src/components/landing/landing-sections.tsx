import { ShieldCheck, Lock, MapPin, BadgeCheck, Star, Quote } from 'lucide-react';

/**
 * Secciones reutilizables para las landings (B2C y B2B). Pensadas para dar
 * confianza: señales reales (no prensa inventada), testimonios de ejemplo y un
 * vistazo al producto por dentro.
 */

/** Banda de señales de confianza REALES (nada fabricado). */
const TRUST = [
  { icon: BadgeCheck, title: 'Grúas verificadas', text: 'Cada proveedor y su documentación se validan a mano.' },
  { icon: Lock, title: 'Pago protegido', text: 'El anticipo se procesa por Mercado Pago. No guardamos tarjetas.' },
  { icon: ShieldCheck, title: 'Datos cuidados', text: 'Tu ubicación exacta se comparte solo con la grúa que te asiste.' },
  { icon: MapPin, title: 'Cobertura AMBA', text: 'Operamos en CABA y Gran Buenos Aires, con seguimiento en vivo.' },
];

export function TrustBand() {
  return (
    <section className="border-y border-border bg-card">
      <div className="container grid gap-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map((t) => (
          <div key={t.title} className="flex items-start gap-3">
            <t.icon className="mt-0.5 h-6 w-6 shrink-0 text-brand-orange" />
            <div>
              <h3 className="text-sm font-semibold">{t.title}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{t.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export interface Testimonial {
  quote: string;
  name: string;
  meta: string;
  rating?: number;
}

/** Testimonios. Contenido de EJEMPLO para reemplazar por reseñas reales. */
export function Testimonials({ title, items }: { title: string; items: Testimonial[] }) {
  return (
    <section className="container py-20">
      <h2 className="text-center text-3xl font-semibold">{title}</h2>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {items.map((t) => (
          <figure key={t.name} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
            <Quote className="h-6 w-6 text-brand-orange/60" aria-hidden />
            <blockquote className="mt-3 flex-1 text-sm leading-relaxed">“{t.quote}”</blockquote>
            <div className="mt-4 flex items-center gap-1" aria-label={`${t.rating ?? 5} de 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={n <= (t.rating ?? 5) ? 'h-3.5 w-3.5 fill-brand-orange text-brand-orange' : 'h-3.5 w-3.5 text-muted-foreground/30'} />
              ))}
            </div>
            <figcaption className="mt-2 text-sm font-medium">
              {t.name} <span className="font-normal text-muted-foreground">· {t.meta}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">Testimonios ilustrativos de la experiencia gruafy.</p>
    </section>
  );
}

/** Mini-maqueta de una pantalla del producto (marco de teléfono estilizado). */
function PhoneMock({ tone, title, children }: { tone: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[220px]">
      <div className="rounded-[2rem] border-[6px] border-brand-ink bg-background p-2 shadow-xl">
        <div className={`rounded-t-2xl ${tone} px-3 py-3`}>
          <p className="text-xs font-semibold">{title}</p>
        </div>
        <div className="space-y-2 rounded-b-2xl bg-card p-3">{children}</div>
      </div>
    </div>
  );
}

function Bar({ w = 'w-full' }: { w?: string }) {
  return <div className={`h-2.5 rounded-full bg-muted ${w}`} />;
}

/** Vistazo al producto "por dentro" con maquetas de las pantallas clave. */
export function ProductPeek({ variant = 'cliente' }: { variant?: 'cliente' | 'gruero' }) {
  return (
    <section className="bg-brand-cream/60 py-20">
      <div className="container">
        <h2 className="text-center text-3xl font-semibold">gruafy por dentro</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
          {variant === 'cliente'
            ? 'Simple en el peor momento: pedir, ver quién viene y seguirlo en vivo.'
            : 'Todo lo que necesitás para trabajar: pedidos, ruta y cobro claro.'}
        </p>
        <div className="mt-12 grid items-start gap-8 sm:grid-cols-3">
          <div className="space-y-3">
            <PhoneMock tone="bg-brand-orange text-brand-ink" title={variant === 'cliente' ? '¿Dónde estás?' : 'Nuevo pedido'}>
              <div className="h-20 rounded-lg bg-brand-green/10" />
              <Bar />
              <Bar w="w-2/3" />
            </PhoneMock>
            <p className="text-center text-sm font-medium">{variant === 'cliente' ? 'Marcás origen y destino' : 'Te llega el pedido con la zona'}</p>
          </div>
          <div className="space-y-3">
            <PhoneMock tone="bg-brand-green text-brand-cream" title={variant === 'cliente' ? 'Una grúa aceptó' : 'Vas en camino'}>
              <Bar w="w-1/2" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-brand-orange/30" />
                <Bar w="w-1/2" />
              </div>
              <div className="h-16 rounded-lg bg-brand-green/10" />
            </PhoneMock>
            <p className="text-center text-sm font-medium">{variant === 'cliente' ? 'Ves quién viene y su reputación' : 'Navegás y contactás al cliente'}</p>
          </div>
          <div className="space-y-3">
            <PhoneMock tone="bg-brand-ink text-brand-cream" title="Seguimiento en vivo">
              <div className="relative h-24 rounded-lg bg-brand-green/10">
                <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-orange" />
              </div>
              <Bar w="w-3/4" />
            </PhoneMock>
            <p className="text-center text-sm font-medium">{variant === 'cliente' ? 'Seguís la grúa en el mapa' : 'Compartís tu ubicación en vivo'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
