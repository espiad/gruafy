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

/** ¿Está configurada la API key de Geoapify? */
export function hasGeoapify(): boolean {
  return Boolean(publicEnv.geoapifyKey);
}

/**
 * Autocompletado de direcciones con sesgo hacia Argentina / AMBA.
 * Devuelve sugerencias con lat/lng ya resueltos.
 */
export async function autocomplete(text: string, signal?: AbortSignal): Promise<GeoPoint[]> {
  if (!publicEnv.geoapifyKey || text.trim().length < 3) return [];
  const url = new URL(`${GEOAPIFY}/geocode/autocomplete`);
  url.searchParams.set('text', text);
  url.searchParams.set('filter', 'countrycode:ar');
  url.searchParams.set('bias', 'rect:-58.9,-35.1,-58.1,-34.3'); // AMBA aproximado
  url.searchParams.set('lang', 'es');
  url.searchParams.set('limit', '5');
  url.searchParams.set('apiKey', publicEnv.geoapifyKey);
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: Array<{ properties: Record<string, unknown> }> };
  return (data.features ?? []).map((f) => ({
    lat: Number(f.properties.lat),
    lng: Number(f.properties.lon),
    address: String(f.properties.formatted ?? ''),
  }));
}

/** Ruta por calle (no línea recta) entre dos puntos: distancia y duración. */
export async function route(a: GeoPoint, b: GeoPoint): Promise<RouteResult | null> {
  if (!publicEnv.geoapifyKey) return null;
  const url = new URL(`${GEOAPIFY}/routing`);
  url.searchParams.set('waypoints', `${a.lat},${a.lng}|${b.lat},${b.lng}`);
  url.searchParams.set('mode', 'drive');
  url.searchParams.set('apiKey', publicEnv.geoapifyKey);
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: Array<{ properties: { distance: number; time: number } }>;
  };
  const p = data.features?.[0]?.properties;
  if (!p) return null;
  return { distanceMeters: Math.round(p.distance), durationSeconds: Math.round(p.time) };
}
