import { ShieldCheck, Lock, MapPin, BadgeCheck, Star, Quote, Users, ImageIcon } from 'lucide-react';
import { FallbackImage } from '@/components/brand/fallback-image';

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

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <figure className="flex w-[300px] shrink-0 flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
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
  );
}

/** Testimonios en carrusel infinito (marquee CSS, se pausa al pasar el mouse). */
export function Testimonials({ title, items }: { title: string; items: Testimonial[] }) {
  // Duplicamos la lista para que el loop sea continuo (se traslada -50%).
  const loop = [...items, ...items];
  return (
    <section className="py-20">
      <h2 className="text-center text-3xl font-semibold">{title}</h2>
      <div className="marquee-mask relative mt-10 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="animate-marquee flex w-max gap-6">
          {loop.map((t, i) => (
            <TestimonialCard key={`${t.name}-${i}`} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Prueba social de la landing B2B: cantidad REAL de grúas aprobadas + un carrusel
 * anónimo (★ y nº de servicios, sin nombres ni caras) cuando hay al menos 3. No usa
 * fotos personales de los grueros (son datos sensibles de verificación).
 */
export function ProviderSocialProof({
  count,
  providers,
}: {
  count: number;
  providers: { legal_name: string }[];
}) {
  if (count < 1) return null;
  const showCarousel = providers.length >= 3;
  // Duplicamos para que el loop del marquee sea continuo.
  const loop = showCarousel ? [...providers, ...providers] : providers;
  return (
    <section className="border-y border-border bg-card py-10">
      <div className="container">
        <p className="text-center text-lg font-semibold">
          <span className="text-brand-orange">+{count}</span> {count === 1 ? 'grúa ya trabaja' : 'grúas ya trabajan'} con gruafy
        </p>
        {showCarousel && (
          <div className="marquee-mask relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="animate-marquee flex w-max gap-3">
              {loop.map((p, i) => (
                <div key={i} className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-brand-green" />
                  <span className="whitespace-nowrap text-sm font-medium">{p.legal_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const TEAM = ['Francisco Goyeneche', 'Juan Pedro Di Meola', 'Federico Goyeneche'];

/**
 * Sección Equipo. Muestra la foto de los tres fundadores (subir a
 * `public/brand/equipo.jpg`); hasta que exista, un placeholder claro.
 */
export function TeamSection() {
  return (
    <section className="bg-brand-green py-20 text-brand-cream">
      <div className="container">
        <h2 className="text-center text-3xl font-semibold">El equipo detrás de gruafy</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-brand-cream/75">
          Un equipo interdisciplinario enfocado en que nunca más te quedes tirado en la ruta.
        </p>
        <div className="mx-auto mt-10 max-w-md">
          <FallbackImage
            src="/brand/equipo.jpg"
            alt="Equipo de gruafy"
            className="aspect-square w-full rounded-2xl object-cover shadow-2xl"
            fallback={
              <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl bg-brand-ink/50 ring-1 ring-brand-cream/10">
                <ImageIcon className="h-8 w-8 text-brand-cream/40" />
                <p className="text-sm text-brand-cream/50">Subí la foto a public/brand/equipo.jpg</p>
              </div>
            }
          />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {TEAM.map((name) => (
              <span key={name} className="inline-flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-brand-orange" /> {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Mini-maqueta de una pantalla del producto (marco de teléfono estilizado). */
function PhoneMock({ tone, title, children }: { tone: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[230px]">
      <div className="rounded-[2.2rem] border-[7px] border-brand-ink bg-brand-ink p-1.5 shadow-2xl">
        {/* Notch */}
        <div className="relative flex items-center justify-center pb-1 pt-0.5">
          <span className="h-1.5 w-12 rounded-full bg-brand-cream/20" />
        </div>
        <div className="overflow-hidden rounded-[1.7rem] bg-card">
          <div className={`flex items-center justify-between ${tone} px-3 py-3`}>
            <p className="text-xs font-semibold">{title}</p>
            <span className="text-[9px] font-medium opacity-70">gruafy</span>
          </div>
          <div className="space-y-2 p-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Bar({ w = 'w-full' }: { w?: string }) {
  return <div className={`h-2.5 rounded-full bg-muted ${w}`} />;
}

function Pill() {
  return <div className="h-6 rounded-lg bg-brand-orange/80" />;
}

/** Vistazo al producto "por dentro" con maquetas de las pantallas clave. */
export function ProductPeek({ variant = 'cliente' }: { variant?: 'cliente' | 'gruero' }) {
  return (
    <section className="bg-brand-cream/60 py-20">
      <div className="container">
        <h2 className="text-center text-3xl font-semibold">gruafy por dentro</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
          {variant === 'cliente'
            ? 'Pedila, seguila en vivo y chau estrés.'
            : 'Todo lo que necesitás para trabajar: pedidos, ruta y cobro claro.'}
        </p>
        <div className="mt-12 grid items-start gap-8 sm:grid-cols-3">
          <div className="space-y-3">
            <PhoneMock tone="bg-brand-orange text-brand-ink" title={variant === 'cliente' ? '¿Dónde estás?' : 'Nuevo pedido'}>
              <div className="relative h-20 overflow-hidden rounded-lg bg-brand-green/10">
                <div className="absolute left-1/3 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-card bg-brand-green" />
                <div className="absolute right-1/4 top-1/3 h-4 w-4 rounded-full border-2 border-card bg-brand-orange" />
              </div>
              <Bar />
              <Bar w="w-2/3" />
              <Pill />
            </PhoneMock>
            <p className="text-center text-sm font-medium">{variant === 'cliente' ? 'Marcás origen y destino' : 'Te llega el pedido con la zona'}</p>
          </div>
          <div className="space-y-3">
            <PhoneMock tone="bg-brand-green text-brand-cream" title={variant === 'cliente' ? 'Una grúa aceptó' : 'Vas en camino'}>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-brand-orange/40" />
                <div className="flex-1 space-y-1">
                  <Bar w="w-2/3" />
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={n <= 4 ? 'h-2.5 w-2.5 fill-brand-orange text-brand-orange' : 'h-2.5 w-2.5 text-muted-foreground/30'} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="h-14 rounded-lg bg-brand-green/10" />
              <Pill />
            </PhoneMock>
            <p className="text-center text-sm font-medium">{variant === 'cliente' ? 'Ves quién viene y su reputación' : 'Navegás y contactás al cliente'}</p>
          </div>
          <div className="space-y-3">
            <PhoneMock tone="bg-brand-ink text-brand-cream" title="Seguimiento en vivo">
              <div className="relative h-24 overflow-hidden rounded-lg bg-brand-green/10">
                {/* Línea de ruta punteada + grúa en movimiento */}
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none">
                  <path d="M12 46 C 35 40, 45 18, 78 14" fill="none" stroke="#1C3C36" strokeWidth="2" strokeDasharray="4 3" opacity="0.4" />
                </svg>
                <div className="absolute left-[12%] bottom-[20%] h-3 w-3 rounded-full border-2 border-card bg-brand-green" />
                <div className="absolute right-[18%] top-[18%] h-3 w-3 rounded-full border-2 border-card bg-brand-orange" />
                <div className="absolute left-[45%] top-[42%] flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-brand-orange shadow">
                  <span className="h-2 w-2 rounded-full bg-brand-ink" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Bar w="w-1/2" />
                <span className="rounded-full bg-brand-green/15 px-2 py-0.5 text-[9px] font-semibold text-brand-green">8 min</span>
              </div>
            </PhoneMock>
            <p className="text-center text-sm font-medium">{variant === 'cliente' ? 'Seguís la grúa en el mapa' : 'Compartís tu ubicación en vivo'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
