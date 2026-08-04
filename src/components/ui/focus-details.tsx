import { ChevronDown } from 'lucide-react';

/**
 * Desplegable único para el "Modo Foco": esconde todo lo secundario (ruta,
 * contacto, desglose, historial) detrás de un solo control, para que la pantalla
 * muestre estado + una acción y nada compita con eso. Cerrado por defecto.
 */
export function FocusDetails({
  summary = 'Ver detalles',
  children,
}: {
  summary?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-border bg-card">
      <summary className="focus-ring flex cursor-pointer list-none items-center justify-between rounded-2xl p-4 text-sm font-medium text-muted-foreground hover:text-foreground">
        {summary}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-border p-4">{children}</div>
    </details>
  );
}
