import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { LoginForm } from './login-form';
import { rushLogout } from '@/features/rush/actions';
import {
  SESSION_COOKIE,
  getStats,
  hoyAR,
  isValidSession,
  sumarDias,
  type Rango,
  type RushStats,
} from '@/features/rush/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'RUSH × Frankia · Analíticas' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#0a0a0b' };

const RANGOS: { key: Rango; label: string }[] = [
  { key: '7', label: '7 días' },
  { key: '30', label: '30 días' },
  { key: 'all', label: 'Histórico' },
];

const nf = new Intl.NumberFormat('es-AR');
const fmt = (n: number) => nf.format(n);
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1).replace('.0', '')}%` : '—');
const diaCorto = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const personas = (n: number) => (n === 1 ? 'persona' : 'personas');

/** Serie diaria completa (los días sin visitas cuentan como 0). */
function serie(stats: RushStats, rango: Rango) {
  const hoy = hoyAR();
  const porDia = new Map(stats.by_day.map((d) => [String(d.day).slice(0, 10), d.visits]));
  const primero =
    rango === '7' ? sumarDias(hoy, -6)
    : rango === '30' ? sumarDias(hoy, -29)
    : (stats.by_day[0] ? String(stats.by_day[0].day).slice(0, 10) : hoy);
  const dias: { day: string; visits: number }[] = [];
  for (let d = primero; d <= hoy; d = sumarDias(d, 1)) dias.push({ day: d, visits: porDia.get(d) ?? 0 });
  return dias;
}

export default async function RushDashboard({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) return <LoginForm />;

  const { r } = await searchParams;
  const rango: Rango = r === '30' || r === 'all' ? r : '7';

  let stats: RushStats | null = null;
  try {
    stats = await getStats(rango);
  } catch {
    stats = null;
  }

  return (
    <main className="min-h-dvh bg-[#0a0a0b] text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        {/* Encabezado */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">Analíticas</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">RUSH × Frankia</h1>
            {stats?.last_event_at && (
              <p className="mt-1 text-xs text-zinc-500">
                Último evento:{' '}
                {new Date(stats.last_event_at).toLocaleString('es-AR', {
                  timeZone: 'America/Argentina/Buenos_Aires',
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
          <form action={rushLogout}>
            <button className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200">
              Salir
            </button>
          </form>
        </header>

        {/* Filtro de período */}
        <nav className="mt-6 inline-flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
          {RANGOS.map((x) => (
            <Link
              key={x.key}
              href={x.key === '7' ? '/rushfrankia' : `/rushfrankia?r=${x.key}`}
              className={`rounded-lg px-3.5 py-1.5 text-sm transition-colors ${
                rango === x.key ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {x.label}
            </Link>
          ))}
        </nav>

        {!stats ? (
          <p className="mt-10 rounded-2xl border border-red-900/50 bg-red-950/30 p-6 text-sm text-red-300">
            No se pudieron cargar las estadísticas. Recargá la página en unos segundos.
          </p>
        ) : (
          <Contenido stats={stats} rango={rango} />
        )}
      </div>
    </main>
  );
}

function Contenido({ stats, rango }: { stats: RushStats; rango: Rango }) {
  const dias = serie(stats, rango);
  const pico = Math.max(0, ...dias.map((d) => d.visits));
  const max = Math.max(1, pico);
  const cada = dias.length > 14 ? Math.ceil(dias.length / 7) : 1; // etiquetas sin amontonar
  const vacio = stats.total_visits === 0 && stats.unique_visitors === 0;

  const metricas = [
    { label: 'Visitantes únicos', valor: stats.unique_visitors },
    { label: 'Visitas totales', valor: stats.total_visits },
    { label: '¿Qué es esto?', valor: stats.reveal_people, sub: personas(stats.reveal_people) },
    { label: 'Clic en entradas', valor: stats.ticket_people, sub: personas(stats.ticket_people) },
  ];

  const embudo = [
    { label: 'Visitantes', valor: stats.unique_visitors },
    { label: 'Descubrieron', valor: stats.reveal_people },
    { label: 'Clic en comprar', valor: stats.ticket_people },
  ];

  return (
    <>
      {/* Métricas principales */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metricas.map((m) => (
          <div key={m.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-xs text-zinc-500">{m.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{fmt(m.valor)}</p>
            {m.sub && <p className="mt-0.5 text-[11px] text-zinc-600">{m.sub}</p>}
          </div>
        ))}
      </section>

      {vacio && (
        <p className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-center text-sm text-zinc-500">
          Todavía no hay visitas en este período. En cuanto alguien entre a la landing, aparece acá.
        </p>
      )}

      {/* Visitas por día */}
      <section className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Visitas por día</h2>
          <p className="text-xs text-zinc-500">pico {fmt(pico)}</p>
        </div>
        <div className="mt-4 flex h-40 items-end gap-[3px]">
          {dias.map((d) => (
            <div key={d.day} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[3px] bg-zinc-200/90 transition-colors group-hover:bg-white"
                style={{ height: `${d.visits === 0 ? 2 : Math.max(4, (d.visits / max) * 100)}%`, opacity: d.visits === 0 ? 0.15 : 1 }}
                title={`${diaCorto(d.day)}: ${fmt(d.visits)} visitas`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-[3px]">
          {dias.map((d, i) => (
            <span key={d.day} className="flex-1 text-center text-[10px] text-zinc-600">
              {i % cada === 0 || i === dias.length - 1 ? diaCorto(d.day) : ''}
            </span>
          ))}
        </div>
      </section>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {/* Embudo de conversión */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:col-span-2 sm:p-5">
          <h2 className="text-sm font-medium">Embudo de conversión</h2>
          <div className="mt-4 space-y-1">
            {embudo.map((e, i) => (
              <div key={e.label}>
                {i > 0 && (
                  <p className="py-1 pl-1 text-[11px] text-zinc-500">
                    ↓ <span className="font-medium text-zinc-300">{pct(e.valor, embudo[i - 1]!.valor)}</span> de la etapa anterior
                  </p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">{e.label}</span>
                  <span className="tabular-nums">
                    {fmt(e.valor)}{' '}
                    <span className="text-xs text-zinc-500">({pct(e.valor, embudo[0]!.valor)})</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-zinc-200"
                    style={{ width: `${embudo[0]!.valor > 0 ? Math.max(2, (e.valor / embudo[0]!.valor) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Instagram */}
        <section className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
          <h2 className="text-sm font-medium">Instagram del creador</h2>
          <div className="mt-4">
            <p className="text-3xl font-semibold tabular-nums tracking-tight">{fmt(stats.instagram_clicks)}</p>
            <p className="text-xs text-zinc-500">
              {stats.instagram_clicks === 1 ? 'clic' : 'clics'} · {fmt(stats.instagram_people)} {personas(stats.instagram_people)}
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              {pct(stats.instagram_people, stats.unique_visitors)} de los visitantes
            </p>
          </div>
        </section>
      </div>

      <p className="mt-6 text-center text-[11px] text-zinc-600">
        Horario de Argentina · visitantes únicos aproximados (identificador anónimo por navegador)
      </p>
    </>
  );
}
