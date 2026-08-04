import type { MetadataRoute } from 'next';

/** Manifest PWA: hace a gruafy instalable ("añadir a inicio") como app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'gruafy — asistencia vial',
    short_name: 'gruafy',
    description: 'Pedí una grúa desde el celu y seguila en vivo. Asistencia vial on-demand en AMBA.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8F7F4',
    theme_color: '#FF9E00',
    orientation: 'portrait',
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
      { src: '/isologo.png', type: 'image/png', sizes: '512x512', purpose: 'any' },
    ],
  };
}
