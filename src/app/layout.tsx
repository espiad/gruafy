import type { Metadata, Viewport } from 'next';
import { Poppins, Zen_Dots } from 'next/font/google';
import '@/styles/globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const zenDots = Zen_Dots({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-zendots',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'gruafy — asistencia vial on-demand',
    template: '%s · gruafy',
  },
  description:
    'Como Uber, pero con grúas. Pedí una grúa desde el celu, seguila en vivo y resolvé sin letra chica. Asistencia vial on-demand en AMBA.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: { title: 'gruafy', description: 'Donde nadie quiere estar, ahí está gruafy.', type: 'website' },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'gruafy', statusBarStyle: 'default' },
  icons: { apple: '/isologo.png' },
};

export const viewport: Viewport = {
  themeColor: '#FF9E00',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${poppins.variable} ${zenDots.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
