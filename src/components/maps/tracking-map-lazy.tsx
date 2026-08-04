'use client';

import dynamic from 'next/dynamic';

/**
 * Carga diferida del mapa de seguimiento: MapLibre (~200 KB) solo se descarga
 * cuando el mapa se muestra de verdad (estados de tracking), no en cada visita a
 * la orden. Baja mucho el peso inicial de la pantalla.
 */
export const TrackingMap = dynamic(
  () => import('./tracking-map').then((m) => m.TrackingMap),
  {
    ssr: false,
    loading: () => <div className="h-72 w-full animate-pulse rounded-xl bg-muted" />,
  },
);
