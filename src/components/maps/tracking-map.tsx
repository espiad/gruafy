'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { publicEnv, hasSupabaseConfig } from '@/lib/env';
import { formatDateTime } from '@/lib/format';

interface Props {
  orderId: string;
  origin?: { lat: number; lng: number } | null;
  dest?: { lat: number; lng: number } | null;
  /** Última posición conocida de la grúa (de la base): estado inicial y fallback. */
  initialProvider?: { lat: number; lng: number; at?: string } | null;
}

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

function labelPin(letter: string, color: string) {
  const el = document.createElement('div');
  el.innerHTML = `
    <div style="position:relative;transform:translateY(-6px)">
      <div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #F8F7F4;box-shadow:0 3px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
        <span style="transform:rotate(45deg);color:#F8F7F4;font:700 13px system-ui">${letter}</span>
      </div>
    </div>`;
  return el;
}

function truckMarker() {
  // La grúa en el mapa se marca con el isotipo de gruafy (no un camión genérico):
  // refuerza marca y es inconfundible. Círculo naranja + isotipo en ink.
  const el = document.createElement('div');
  el.innerHTML = `
    <div style="width:42px;height:42px;border-radius:50%;background:#FF9E00;border:3px solid #001910;box-shadow:0 3px 12px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center">
      <svg width="22" height="14" viewBox="0 0 366 202" fill="#001910" xmlns="http://www.w3.org/2000/svg" aria-label="gruafy">
        <path d="M73.9153 201.874L0 100.899L34.8554 53.2444L143.321 201.874H73.9153Z"/>
        <path d="M221.608 0.182817L221.547 0L108.572 154.419L143.183 201.89L290.953 0.0609387L221.608 0.182817Z"/>
        <path d="M365.059 101.045L291.143 0.0692025H290.96L256.288 47.4186L330.142 148.699L365.059 101.045Z"/>
        <path d="M330.201 148.679L291.141 202H221.735L295.529 101.146L330.201 148.679Z"/>
      </svg>
    </div>`;
  return el;
}

/** Mapa con recogida (A), destino (B) y la grúa en vivo (Realtime + refresco de base). */
export function TrackingMap({ orderId, origin, dest, initialProvider }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const providerMarker = useRef<maplibregl.Marker | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(initialProvider?.at ?? null);
  const [hasSignal, setHasSignal] = useState(Boolean(initialProvider));

  const oLat = origin?.lat, oLng = origin?.lng, dLat = dest?.lat, dLng = dest?.lng;
  const ipLat = initialProvider?.lat, ipLng = initialProvider?.lng, ipAt = initialProvider?.at;

  function place(lat: number, lng: number, ease = false) {
    const map = mapRef.current;
    if (!map) return;
    if (!providerMarker.current) {
      providerMarker.current = new maplibregl.Marker({ element: truckMarker() }).setLngLat([lng, lat]).addTo(map);
    } else {
      providerMarker.current.setLngLat([lng, lat]);
    }
    if (ease) map.easeTo({ center: [lng, lat], duration: 800 });
    setHasSignal(true);
  }

  // Inicializa el mapa UNA vez (por orden). No re-inicializa en cada refresco.
  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const center = origin ?? dest ?? initialProvider ?? { lat: -34.6037, lng: -58.3816 };
    const map = new maplibregl.Map({
      container: container.current,
      style: mapStyle(),
      center: [center.lng, center.lat],
      zoom: 12,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    if (oLat != null && oLng != null)
      new maplibregl.Marker({ element: labelPin('A', '#1C3C36'), anchor: 'bottom' }).setLngLat([oLng, oLat]).setPopup(new maplibregl.Popup({ offset: 24 }).setText('Punto de recogida')).addTo(map);
    if (dLat != null && dLng != null)
      new maplibregl.Marker({ element: labelPin('B', '#FF9E00'), anchor: 'bottom' }).setLngLat([dLng, dLat]).setPopup(new maplibregl.Popup({ offset: 24 }).setText('Destino')).addTo(map);

    if (oLat != null && dLat != null) {
      map.on('load', () => {
        if (map.getSource('trip')) return;
        map.addSource('trip', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[oLng!, oLat], [dLng!, dLat]] } } });
        map.addLayer({ id: 'trip', type: 'line', source: 'trip', paint: { 'line-color': '#1C3C36', 'line-width': 4, 'line-dasharray': [1.4, 1.1] } });
      });
      const b = new maplibregl.LngLatBounds([oLng!, oLat], [oLng!, oLat]);
      b.extend([dLng!, dLat]);
      map.fitBounds(b, { padding: 70, maxZoom: 14 });
    }

    if (ipLat != null && ipLng != null) place(ipLat, ipLng);

    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
    if (hasSupabaseConfig) {
      channel = createClient()
        .channel(`order:${orderId}`)
        .on('broadcast', { event: 'location' }, (msg) => {
          const p = msg.payload as { lat: number; lng: number; at?: number };
          place(p.lat, p.lng, true);
          setLastUpdate(new Date(p.at ?? Date.now()).toISOString());
        })
        .subscribe();
    }

    return () => {
      channel?.unsubscribe();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Refresco desde la base (auto-refresh cada 3s): mueve la grúa aunque no llegue Realtime.
  useEffect(() => {
    if (ipLat != null && ipLng != null) {
      place(ipLat, ipLng);
      if (ipAt) setLastUpdate(ipAt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ipLat, ipLng, ipAt]);

  return (
    <div className="space-y-1">
      <div className="relative">
        <div ref={container} className="h-72 w-full overflow-hidden rounded-2xl border border-border" />
        {!hasSignal && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 rounded-b-2xl bg-brand-ink/80 py-2 text-xs text-brand-cream">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Esperando la señal de la grúa…
          </div>
        )}
      </div>
      {lastUpdate && (
        <p className="text-right text-xs text-muted-foreground">Última posición: {formatDateTime(lastUpdate)}</p>
      )}
    </div>
  );
}
