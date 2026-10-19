import 'server-only';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

/*
 * Analíticas de RUSH × Frankia. Módulo aislado de gruafy: no usa sus tipos de base
 * ni su auth. Para eliminarlo: borrar src/features/rush, src/app/rushfrankia,
 * src/app/api/rush, la exclusión en middleware.ts y la migración 0011.
 */

export const RUSH_EVENTS = ['page_view', 'reveal_click', 'ticket_click'] as const;
export type RushEvent = (typeof RUSH_EVENTS)[number];
/** Eventos que ya no se miden: se aceptan (para no generar errores en la landing) y se descartan. */
export const RUSH_IGNORED_EVENTS = ['instagram_click'];

export const SESSION_COOKIE = 'rf_session';
export const TRY_COOKIE = 'rf_try';
export const COOKIE_PATH = '/rushfrankia';
const SESSION_DAYS = 7;
export const MAX_TRIES = 8;
export const LOCK_MINUTES = 10;

// ── CORS (compartido por los endpoints públicos) ──────────────────────────────

export function allowedOrigins(): string[] {
  return (process.env.RUSH_LANDING_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function originAllowed(origin: string | null): boolean {
  const allowed = allowedOrigins();
  return allowed.length === 0 || (origin != null && allowed.includes(origin));
}

export function corsHeaders(origin: string | null, methods: string): Record<string, string> {
  const allowed = allowedOrigins();
  // Sin configurar, se acepta cualquier origen (útil para probar). En producción se
  // setea RUSH_LANDING_ORIGIN con el dominio de Netlify.
  const allow = allowed.length === 0 ? '*' : origin && allowed.includes(origin) ? origin : allowed[0]!;
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/** Cliente con service role, sin tipado de gruafy (la tabla es ajena a su esquema). */
export function rushDb() {
  const url = serverEnv.supabaseUrl();
  const key = serverEnv.serviceRoleKey();
  if (!url || !key) throw new Error('Supabase no configurado');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function password(): string {
  return process.env.RUSH_DASHBOARD_PASSWORD || 'rushfrankia';
}

function secret(): string {
  // Con RUSH_SESSION_SECRET es lo ideal. Si falta, derivamos del password: cambiar
  // la contraseña invalida todas las sesiones abiertas, que es lo esperable.
  return process.env.RUSH_SESSION_SECRET || `rf:${password()}`;
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

/** Comparación en tiempo constante (hasheamos para igualar longitudes). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(input: string): boolean {
  return safeEqual(input, password());
}

// ── Sesión ────────────────────────────────────────────────────────────────────

export function newSessionToken(): { value: string; maxAge: number } {
  const exp = Date.now() + SESSION_DAYS * 86400000;
  const payload = String(exp);
  return { value: `${payload}.${sign(payload)}`, maxAge: SESSION_DAYS * 86400 };
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, mac] = token.split('.');
  if (!payload || !mac) return false;
  if (!safeEqual(mac, sign(payload))) return false;
  const exp = Number(payload);
  return Number.isFinite(exp) && exp > Date.now();
}

// ── Limitador de intentos (cookie firmada: no se puede falsificar) ─────────────

export function readTries(token: string | undefined): { n: number; first: number } {
  if (!token) return { n: 0, first: Date.now() };
  const [n, first, mac] = token.split('.');
  if (!n || !first || !mac || !safeEqual(mac, sign(`${n}.${first}`))) return { n: 0, first: Date.now() };
  const t = { n: Number(n), first: Number(first) };
  // Pasada la ventana, arranca de cero.
  if (Date.now() - t.first > LOCK_MINUTES * 60000) return { n: 0, first: Date.now() };
  return t;
}

export function writeTries(t: { n: number; first: number }): string {
  const payload = `${t.n}.${t.first}`;
  return `${payload}.${sign(payload)}`;
}

// ── Estadísticas ──────────────────────────────────────────────────────────────

export type Rango = '7' | '30' | 'all';

export interface RushStats {
  unique_visitors: number;
  total_visits: number;
  reveal_people: number;
  ticket_people: number;
  instagram_clicks: number;
  instagram_people: number;
  by_day: { day: string; visits: number; visitors: number }[];
  last_event_at: string | null;
}

const TZ = 'America/Argentina/Buenos_Aires';

/** Fecha de hoy en Argentina, YYYY-MM-DD. */
export function hoyAR(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

/** Suma días a una fecha YYYY-MM-DD (aritmética en UTC, sin horario de verano). */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Inicio del rango: medianoche de Argentina (UTC-3) del primer día. */
export function inicioRango(r: Rango): string {
  if (r === 'all') return '2000-01-01T00:00:00Z';
  const dias = r === '7' ? 6 : 29;
  return `${sumarDias(hoyAR(), -dias)}T03:00:00Z`;
}

// ── URL de la ticketera (botón de preventa) ───────────────────────────────────

export async function getTicketUrl(): Promise<string> {
  const { data } = await rushDb().from('rush_config').select('value').eq('key', 'ticket_url').maybeSingle();
  return (data?.value as string | undefined) ?? '';
}

/**
 * Valida la URL antes de guardarla: tiene que ser http(s) y válida. Vacía también
 * se acepta (deja el botón como "todavía no disponible"). Devuelve la URL limpia
 * o un mensaje de error.
 */
export function normalizeTicketUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  const v = raw.trim();
  if (!v) return { ok: true, url: '' };
  if (v.length > 500) return { ok: false, error: 'La URL es demasiado larga.' };
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, error: 'Tiene que empezar con https://' };
    return { ok: true, url: u.toString() };
  } catch {
    return { ok: false, error: 'No parece una URL válida. Ejemplo: https://ticketera.com/evento' };
  }
}

export async function setTicketUrl(url: string): Promise<boolean> {
  const { data, error } = await rushDb()
    .from('rush_config')
    .upsert({ key: 'ticket_url', value: url, updated_at: new Date().toISOString() })
    .select('key');
  return !error && Boolean(data && data.length > 0);
}

/** Borra todos los eventos. Devuelve false si la base rechazó la operación. */
export async function resetEvents(): Promise<boolean> {
  // PostgREST exige un filtro para DELETE: `id > 0` abarca todas las filas.
  const { error } = await rushDb().from('rush_events').delete().gt('id', 0);
  return !error;
}

export async function getStats(r: Rango): Promise<RushStats> {
  const { data, error } = await rushDb().rpc('rush_stats', { p_since: inicioRango(r) });
  if (error) throw new Error(error.message);
  return data as RushStats;
}
