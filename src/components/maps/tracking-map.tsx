'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createClient } from '@/lib/supabase/client';
import { publicEnv, hasSupabaseConfig } from '@/lib/env';
import { formatDateTime } from '@/lib/format';

interface Props {
  orderId: string;
  origin?: { lat: number; lng: number } | null;
  dest?: { lat: number; lng: number } | null;
  /** Última posición conocida del proveedor para el estado inicial. */
  initialProvider?: { lat: number; lng: number; at?: string } | null;
}

function mapStyle(): string | maplibregl.StyleSpecification {
  if (publicEnv.geoapifyKey) {
    return `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${publicEnv.geoapifyKey}`;
  }
  // Fallback raster OSM (sin API key) para que el mapa funcione igual.
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap',
      },
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
  };
}

/** Pin tipo "gota" con una letra/etiqueta adentro (recogida/destino). */
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

/** Marcador de la grúa: círculo con ícono de camión, bien visible. */
function truckMarker() {
  const el = document.createElement('div');
  el.innerHTML = `
    <div style="width:38px;height:38px;border-radius:50%;background:#FF9E00;border:3px solid #001910;box-shadow:0 3px 10px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#001910" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
    </div>`;
  return el;
}

/** Mapa con origen, destino y la grúa en vivo (Supabase Realtime, canal por orden). */
export function TrackingMap({ orderId, origin, dest, initialProvider }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const providerMarker = useRef<maplibregl.Marker | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(initialProvider?.at ?? null);

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

    if (origin)
      new maplibregl.Marker({ element: labelPin('A', '#1C3C36'), anchor: 'bottom' })
        .setLngLat([origin.lng, origin.lat])
        .setPopup(new maplibregl.Popup({ offset: 24 }).setText('Punto de recogida'))
        .addTo(map);
    if (dest)
      new maplibregl.Marker({ element: labelPin('B', '#FF9E00'), anchor: 'bottom' })
        .setLngLat([dest.lng, dest.lat])
        .setPopup(new maplibregl.Popup({ offset: 24 }).setText('Destino'))
        .addTo(map);

    // Línea de ruta A → B.
    if (origin && dest) {
      map.on('load', () => {
        if (map.getSource('trip')) return;
        map.addSource('trip', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[origin.lng, origin.lat], [dest.lng, dest.lat]] } },
        });
        map.addLayer({ id: 'trip', type: 'line', source: 'trip', paint: { 'line-color': '#1C3C36', 'line-width': 4, 'line-dasharray': [1.4, 1.1] } });
      });
      const b = new maplibregl.LngLatBounds([origin.lng, origin.lat], [origin.lng, origin.lat]);
      b.extend([dest.lng, dest.lat]);
      map.fitBounds(b, { padding: 70, maxZoom: 14 });
    }

    const place = (lat: number, lng: number) => {
      if (!providerMarker.current) {
        providerMarker.current = new maplibregl.Marker({ element: truckMarker() }).setLngLat([lng, lat]).addTo(map);
      } else {
        providerMarker.current.setLngLat([lng, lat]);
      }
    };
    if (initialProvider) place(initialProvider.lat, initialProvider.lng);

    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
    if (hasSupabaseConfig) {
      channel = createClient()
        .channel(`order:${orderId}`)
        .on('broadcast', { event: 'location' }, (msg) => {
          const p = msg.payload as { lat: number; lng: number; at?: number };
          place(p.lat, p.lng);
          map.easeTo({ center: [p.lng, p.lat], duration: 800 });
          setLastUpdate(new Date(p.at ?? Date.now()).toISOString());
        })
        .subscribe();
    }

    return () => {
      channel?.unsubscribe();
      map.remove();
      mapRef.current = null;
    };
  }, [orderId, origin, dest, initialProvider]);

  return (
    <div className="space-y-1">
      <div ref={container} className="h-72 w-full overflow-hidden rounded-2xl border border-border" />
      {lastUpdate && (
        <p className="text-right text-xs text-muted-foreground">
          Última posición: {formatDateTime(lastUpdate)}
        </p>
      )}
    </div>
  );
}
