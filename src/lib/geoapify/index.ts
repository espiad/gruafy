import { publicEnv } from '@/lib/env';

/** Punto geográfico con dirección visible. */
export interface GeoPoint {
  lat: number;
  lng: number;
  address: string;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
}

const GEOAPIFY = 'https://api.geoapify.com/v1';

/**
 * Caja delimitadora aproximada del AMBA (CABA + Gran Buenos Aires).
 * lon/lat de dos esquinas opuestas. Se usa para restringir búsquedas y validar.
 */
export const AMBA_BOUNDS = {
  west: -59.15,
  south: -35.15,
  east: -57.85,
  north: -34.2,
};

/** ¿El punto está dentro del AMBA? */
export function isInAMBA(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat <= AMBA_BOUNDS.north &&
    lat >= AMBA_BOUNDS.south &&
    lng >= AMBA_BOUNDS.west &&
    lng <= AMBA_BOUNDS.east
  );
}

/** ¿Está configurada la API key de Geoapify? */
export function hasGeoapify(): boolean {
  return Boolean(publicEnv.geoapifyKey);
}

function validPoint(lat: unknown, lng: unknown): boolean {
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
}

/**
 * Autocompletado de direcciones RESTRINGIDO al AMBA (filtro por rectángulo).
 * Devuelve solo sugerencias con coordenadas válidas dentro de la zona.
 */
export async function autocomplete(text: string, signal?: AbortSignal): Promise<GeoPoint[]> {
  if (!publicEnv.geoapifyKey || text.trim().length < 3) return [];
  const url = new URL(`${GEOAPIFY}/geocode/autocomplete`);
  url.searchParams.set('text', text);
  // filter=rect RESTRINGE (no solo prioriza) los resultados al AMBA.
  url.searchParams.set(
    'filter',
    `rect:${AMBA_BOUNDS.west},${AMBA_BOUNDS.south},${AMBA_BOUNDS.east},${AMBA_BOUNDS.north}`,
  );
  url.searchParams.set('bias', 'proximity:-58.4416,-34.6037');
  url.searchParams.set('lang', 'es');
  url.searchParams.set('limit', '6');
  url.searchParams.set('apiKey', publicEnv.geoapifyKey);
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: Array<{ properties: Record<string, unknown> }> };
  return (data.features ?? [])
    .filter((f) => validPoint(f.properties.lat, f.properties.lon))
    .map((f) => ({
      lat: Number(f.properties.lat),
      lng: Number(f.properties.lon),
      address: String(f.properties.formatted ?? ''),
    }))
    .filter((p) => isInAMBA(p.lat, p.lng));
}

/** Geocodificación inversa: de coordenadas a dirección legible. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!publicEnv.geoapifyKey || !validPoint(lat, lng)) return null;
  const url = new URL(`${GEOAPIFY}/geocode/reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('lang', 'es');
  url.searchParams.set('limit', '1');
  url.searchParams.set('apiKey', publicEnv.geoapifyKey);
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: Array<{ properties: { formatted?: string } }> };
  return data.features?.[0]?.properties?.formatted ?? null;
}

/** Ruta por calle (no línea recta) entre dos puntos: distancia y duración. */
export async function route(a: GeoPoint, b: GeoPoint): Promise<RouteResult | null> {
  if (!publicEnv.geoapifyKey || !validPoint(a.lat, a.lng) || !validPoint(b.lat, b.lng)) return null;
  const url = new URL(`${GEOAPIFY}/routing`);
  url.searchParams.set('waypoints', `${a.lat},${a.lng}|${b.lat},${b.lng}`);
  url.searchParams.set('mode', 'drive');
  url.searchParams.set('apiKey', publicEnv.geoapifyKey);
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: Array<{ properties: { distance?: number; time?: number } }>;
  };
  const p = data.features?.[0]?.properties;
  if (!p || !Number.isFinite(p.distance) || !Number.isFinite(p.time)) return null;
  return { distanceMeters: Math.round(p.distance as number), durationSeconds: Math.round(p.time as number) };
}
