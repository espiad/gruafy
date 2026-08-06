'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ImageOff, Download } from 'lucide-react';

/**
 * Visor de imágenes dentro de la app. Antes las fotos se abrían en una pestaña
 * nueva y no había forma de volver atrás. Muestra un loader mientras carga (así se
 * nota que hay una foto en camino), se cierra con la ✕, tocando afuera o con Escape,
 * y deja descargarla.
 */
export function ImageViewer({
  url,
  alt,
  onClose,
}: {
  url: string;
  alt: string;
  onClose: () => void;
}) {
  const [cargando, setCargando] = useState(true);
  const [falló, setFalló] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  // Escape para cerrar + bloqueo del scroll de fondo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!montado) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-ink/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="focus-ring absolute right-4 top-4 rounded-full bg-brand-cream/10 p-2 text-brand-cream hover:bg-brand-cream/20"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="relative max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        {cargando && !falló && (
          <div className="flex flex-col items-center gap-2 text-brand-cream/80">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Cargando la foto…</p>
          </div>
        )}
        {falló && (
          <div className="flex flex-col items-center gap-2 text-brand-cream/80">
            <ImageOff className="h-8 w-8" />
            <p className="text-sm">No pudimos cargar la foto.</p>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          onLoad={() => setCargando(false)}
          onError={() => {
            setCargando(false);
            setFalló(true);
          }}
          className={`max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl ${cargando || falló ? 'hidden' : ''}`}
        />
        {!cargando && !falló && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-cream/10 px-3 py-2 text-sm font-medium text-brand-cream hover:bg-brand-cream/20"
          >
            <Download className="h-4 w-4" /> Abrir en tamaño completo
          </a>
        )}
      </div>
    </div>,
    document.body,
  );
}
