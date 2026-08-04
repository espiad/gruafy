import { GruafyMark } from '@/components/brand/logo';

/**
 * Loader de marca: el isotipo de gruafy latiendo. Se usa en los `loading.tsx` de
 * ruta (Suspense de Next) y donde una espera pueda hacer sentir la app "trabada".
 * Con branding, la espera comunica que algo está pasando, no que se colgó.
 */
export function BrandLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <span className="relative inline-flex">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-orange/20" />
        <GruafyMark className="h-10 w-auto animate-pulse-soft text-brand-orange" />
      </span>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
