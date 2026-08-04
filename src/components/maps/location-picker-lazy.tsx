'use client';

import dynamic from 'next/dynamic';

/**
 * Carga diferida del selector de ubicación (usa MapLibre). Difiere ~200 KB hasta
 * que el paso del mapa se muestra, aligerando la carga inicial del wizard.
 */
export const LocationPicker = dynamic(
  () => import('./location-picker').then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />,
  },
);
