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

function marker(color: string) {
  const el = document.createElement('div');
  el.style.cssText = `width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #F8F7F4;box-shadow:0 1px 4px rgba(0,0,0,.4)`;
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

    if (origin) new maplibregl.Marker({ element: marker('#1C3C36') }).setLngLat([origin.lng, origin.lat]).setPopup(new maplibregl.Popup().setText('Origen')).addTo(map);
    if (dest) new maplibregl.Marker({ element: marker('#FF9E00') }).setLngLat([dest.lng, dest.lat]).setPopup(new maplibregl.Popup().setText('Destino')).addTo(map);

    if (origin && dest) {
      const b = new maplibregl.LngLatBounds([origin.lng, origin.lat], [origin.lng, origin.lat]);
      b.extend([dest.lng, dest.lat]);
      map.fitBounds(b, { padding: 60, maxZoom: 14 });
    }

    const place = (lat: number, lng: number) => {
      if (!providerMarker.current) {
        providerMarker.current = new maplibregl.Marker({ element: marker('#E08A00') })
          .setLngLat([lng, lat])
          .addTo(map);
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
