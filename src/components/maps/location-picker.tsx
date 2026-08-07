'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LocateFixed, Loader2, MapPin, Flag, X } from 'lucide-react';
import { publicEnv } from '@/lib/env';
import {
  autocomplete,
  reverseGeocode,
  route,
  isInAMBA,
  AMBA_BOUNDS,
  type GeoPoint,
} from '@/lib/geoapify';
import { haversineMeters } from '@/lib/geo/distance';
import { formatDistance } from '@/lib/format';

function mapStyle(): string | maplibregl.StyleSpecification {
  if (publicEnv.geoapifyKey) {
    return `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${publicEnv.geoapifyKey}`;
  }
  return {
    version: 8,
    sources: {
      osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap' },
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
  };
}

function pin(color: string) {
  const el = document.createElement('div');
  el.style.cssText = `width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #F8F7F4;box-shadow:0 2px 6px rgba(0,0,0,.4)`;
  return el;
}

interface Props {
  origin: GeoPoint | null;
  dest: GeoPoint | null;
  onOrigin: (p: GeoPoint | null) => void;
  onDest: (p: GeoPoint | null) => void;
  onDistance: (meters: number | null, seconds: number | null) => void;
}

type Field = 'origin' | 'dest';

/**
 * Búsqueda de dirección (AMBA). UX: sugiere mientras escribís, pero al elegir una
 * cierra y NO vuelve a sugerir (hasta que edites). Overlay sólido con z alto para
 * que no compita con el mapa, y botón para limpiar y buscar de nuevo.
 */
function AddressSearch({
  label,
  color,
  value,
  onPick,
  onClear,
}: {
  label: string;
  color: string;
  value: GeoPoint | null;
  onPick: (p: GeoPoint) => void;
  onClear: () => void;
}) {
  const [text, setText] = useState(value?.address ?? '');
  const [results, setResults] = useState<GeoPoint[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Dirección ya elegida: mientras el texto coincida, no volvemos a sugerir.
  const chosenRef = useRef<string | null>(value?.address ?? null);

  // Si el valor cambia desde afuera (ej: "usar mi ubicación" o toque en el mapa).
  useEffect(() => {
    if (value?.address && value.address !== text) {
      setText(value.address);
      chosenRef.current = value.address;
      setResults([]);
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.address]);

  useEffect(() => {
    const q = text.trim();
    // No sugerir si está vacío, muy corto, o si es exactamente lo ya elegido.
    if (q.length < 3 || q === chosenRef.current) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const r = await autocomplete(q, ctrl.signal);
        setResults(r);
        setOpen(r.length > 0);
      } catch {
        /* cancelado */
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [text]);

  function choose(p: GeoPoint) {
    chosenRef.current = p.address;
    setText(p.address);
    setResults([]);
    setOpen(false);
    inputRef.current?.blur(); // cierra el teclado en mobile
    onPick(p);
  }

  function clear() {
    chosenRef.current = null;
    setText('');
    setResults([]);
    setOpen(false);
    onClear();
    inputRef.current?.focus();
  }

  const hasValue = Boolean(value);

  return (
    <div className="relative">
      <label className="mb-1 flex items-center gap-1.5 text-sm font-medium">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          value={text}
          placeholder="Escribí una dirección del AMBA"
          onChange={(e) => {
            chosenRef.current = null; // el usuario está editando
            setText(e.target.value);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={`focus-ring h-12 w-full rounded-lg border bg-background pl-3 pr-9 text-base ${hasValue ? 'border-success' : 'border-input'}`}
          autoComplete="off"
        />
        {(text.length > 0 || hasValue) && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clear}
            aria-label="Limpiar"
            className="focus-ring absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-popover shadow-xl">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lng}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                className="flex w-full items-start gap-2 border-b border-border/50 px-3 py-3 text-left text-sm last:border-0 hover:bg-accent"
                onClick={() => choose(r)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                <span>{r.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {loading && text.trim().length >= 3 && !open && (
        <p className="mt-1 text-xs text-muted-foreground">Buscando…</p>
      )}
    </div>
  );
}

/**
 * Selector de origen y destino con mapa. Restringido al AMBA. Permite:
 * usar la ubicación actual, buscar por dirección o tocar el mapa. Calcula la ruta.
 */
export function LocationPicker({ origin, dest, onOrigin, onDest, onDistance }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const originMarker = useRef<maplibregl.Marker | null>(null);
  const destMarker = useRef<maplibregl.Marker | null>(null);
  const activeRef = useRef<Field>('origin');
  const [active, setActive] = useState<Field>('origin');
  const [locating, setLocating] = useState(false);
  const [routing, setRouting] = useState(false);
  const [meters, setMeters] = useState<number | null>(null);
  const [estimated, setEstimated] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);

  const onOriginRef = useRef(onOrigin);
  const onDestRef = useRef(onDest);
  onOriginRef.current = onOrigin;
  onDestRef.current = onDest;

  // Inicializa el mapa una sola vez.
  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: mapStyle(),
      center: [-58.4416, -34.6037], // CABA
      zoom: 11,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.setMaxBounds([
      [AMBA_BOUNDS.west - 0.2, AMBA_BOUNDS.south - 0.2],
      [AMBA_BOUNDS.east + 0.2, AMBA_BOUNDS.north + 0.2],
    ]);
    mapRef.current = map;

    // Tocar el mapa fija el punto activo (origen o destino).
    map.on('click', async (e) => {
      const { lat, lng } = e.lngLat;
      if (!isInAMBA(lat, lng)) {
        setWarn('Ese punto está fuera del AMBA. Por ahora operamos solo en esa zona.');
        return;
      }
      setWarn(null);
      const address = (await reverseGeocode(lat, lng)) ?? `Punto (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      const point: GeoPoint = { lat, lng, address };
      if (activeRef.current === 'origin') onOriginRef.current(point);
      else onDestRef.current(point);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sincroniza marcadores con origin/dest.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (origin) {
      if (!originMarker.current) originMarker.current = new maplibregl.Marker({ element: pin('#1C3C36') }).setLngLat([origin.lng, origin.lat]).addTo(map);
      else originMarker.current.setLngLat([origin.lng, origin.lat]);
    } else if (originMarker.current) {
      originMarker.current.remove();
      originMarker.current = null;
    }
    if (dest) {
      if (!destMarker.current) destMarker.current = new maplibregl.Marker({ element: pin('#FF9E00') }).setLngLat([dest.lng, dest.lat]).addTo(map);
      else destMarker.current.setLngLat([dest.lng, dest.lat]);
    } else if (destMarker.current) {
      destMarker.current.remove();
      destMarker.current = null;
    }

    // Encaja la vista.
    if (origin && dest) {
      const b = new maplibregl.LngLatBounds([origin.lng, origin.lat], [origin.lng, origin.lat]);
      b.extend([dest.lng, dest.lat]);
      map.fitBounds(b, { padding: 70, maxZoom: 14, duration: 600 });
    } else if (origin) {
      map.easeTo({ center: [origin.lng, origin.lat], zoom: 14, duration: 600 });
    } else if (dest) {
      map.easeTo({ center: [dest.lng, dest.lat], zoom: 14, duration: 600 });
    }
  }, [origin, dest]);

  // Calcula la ruta cuando hay origen y destino.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!origin || !dest) {
        setMeters(null);
        onDistance(null, null);
        return;
      }
      setRouting(true);
      const r = await route(origin, dest);
      if (cancelled) return;
      setRouting(false);
      if (r) {
        setEstimated(false);
        setMeters(r.distanceMeters);
        onDistance(r.distanceMeters, r.durationSeconds);
        // Dibuja la línea de ruta si el mapa está listo.
        drawRoute(origin, dest);
      } else {
        // Geoapify no respondió: NO bloqueamos el pedido. Estimamos por distancia
        // en línea recta × 1.3 (factor de callejeo típico) y ~30 km/h de promedio.
        const straight = haversineMeters(origin, dest);
        const est = Math.round(straight * 1.3);
        const seconds = Math.round((est / 1000 / 30) * 3600);
        setEstimated(true);
        setMeters(est);
        onDistance(est, seconds);
        drawRoute(origin, dest);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lng, dest?.lat, dest?.lng]);

  function drawRoute(a: GeoPoint, b: GeoPoint) {
    const map = mapRef.current;
    if (!map) return;
    const data: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: [[a.lng, a.lat], [b.lng, b.lat]] },
    };
    const src = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data);
    else {
      map.addSource('route', { type: 'geojson', data });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#1C3C36', 'line-width': 4, 'line-dasharray': [1.5, 1.2] },
      });
    }
  }

  function useMyLocation() {
    setWarn(null);
    if (!('geolocation' in navigator)) {
      setWarn('Tu navegador no permite geolocalización. Buscá la dirección a mano.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocating(false);
        if (!isInAMBA(lat, lng)) {
          setWarn('Tu ubicación está fuera del AMBA. Por ahora operamos solo en esa zona.');
          return;
        }
        const address = (await reverseGeocode(lat, lng)) ?? 'Mi ubicación actual';
        onOrigin({ lat, lng, address });
        setActive('dest');
        activeRef.current = 'dest';
      },
      () => {
        setLocating(false);
        setWarn('No pudimos obtener tu ubicación. Revisá los permisos o buscá la dirección.');
      },
      { enableHighAccuracy: true, timeout: 9000 },
    );
  }

  function setActiveField(f: Field) {
    setActive(f);
    activeRef.current = f;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-green text-sm font-semibold text-brand-cream disabled:opacity-60"
      >
        {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
        Usar mi ubicación actual
      </button>

      <AddressSearch
        label="¿Dónde estás? (origen)"
        color="#1C3C36"
        value={origin}
        onPick={(p) => {
          onOrigin(p);
          setActiveField('dest');
        }}
        onClear={() => {
          onOrigin(null);
          onDistance(null, null);
          setActiveField('origin');
        }}
      />
      <AddressSearch
        label="¿A dónde lo llevás? (destino)"
        color="#FF9E00"
        value={dest}
        onPick={(p) => onDest(p)}
        onClear={() => {
          onDest(null);
          onDistance(null, null);
          setActiveField('dest');
        }}
      />

      {/* Selector de qué fija el toque en el mapa */}
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveField('origin')}
          className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-2 font-medium ${active === 'origin' ? 'border-brand-green bg-brand-green/10 text-brand-green' : 'border-input text-muted-foreground'}`}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" /> Fijar origen
        </button>
        <button
          type="button"
          onClick={() => setActiveField('dest')}
          className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-2 font-medium ${active === 'dest' ? 'border-brand-orange bg-brand-orange/10 text-brand-green' : 'border-input text-muted-foreground'}`}
        >
          <Flag className="h-3.5 w-3.5 shrink-0" /> Fijar destino
        </button>
      </div>

      <div ref={container} className="h-64 w-full overflow-hidden rounded-xl border border-border" />

      {warn && <p className="rounded-md bg-warning/15 p-2.5 text-xs text-warning-foreground">{warn}</p>}
      {routing && <p className="text-sm text-muted-foreground">Calculando ruta…</p>}
      {meters != null && (
        <p className="rounded-lg bg-brand-green/5 p-3 text-sm">
          Recorrido estimado: <strong>{formatDistance(meters)}</strong>
          {estimated && (
            <span className="ml-1 text-xs text-muted-foreground">
              (aproximado; se ajusta al confirmar)
            </span>
          )}
        </p>
      )}
    </div>
  );
}
