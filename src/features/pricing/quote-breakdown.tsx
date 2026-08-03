import { formatARS, formatDistance } from '@/lib/format';
import type { QuoteBreakdown } from './pricing';
import { cn } from '@/lib/utils';

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className={cn(muted ? 'text-muted-foreground' : 'text-foreground')}>{label}</span>
      <span className={cn('tabular-nums', muted ? 'text-muted-foreground' : 'font-medium')}>{value}</span>
    </div>
  );
}

/**
 * Desglose de precio con separación visual clara entre lo que se paga AHORA por
 * Mercado Pago y lo que se paga DESPUÉS al gruero. Nunca muestra un total ambiguo.
 */
export function QuoteBreakdownCard({ quote }: { quote: QuoteBreakdown }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Detalle del servicio
        </p>
        <Row label="Movida base" value={formatARS(quote.movida_base)} muted />
        <Row
          label={`Kilómetros (${quote.km_facturables} km · ruta ${formatDistance(quote.km_facturables * 1000)})`}
          value={formatARS(quote.costo_km)}
          muted
        />
        {quote.costo_dollys > 0 && (
          <Row label="Dollys" value={formatARS(quote.costo_dollys)} muted />
        )}
        <div className="my-2 border-t border-dashed border-border" />
        <Row label="Subtotal del gruero" value={formatARS(quote.subtotal_proveedor)} />
        <Row label="IVA del gruero (21%)" value={formatARS(quote.iva_gruero)} muted />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border-2 border-brand-orange bg-brand-orange/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-green">Pagás ahora</p>
          <p className="mt-1 font-display text-2xl text-brand-green">
            {formatARS(quote.pago_inicial_cliente)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Comisión de gruafy (20%) {formatARS(quote.comision_gruafy)} + procesamiento{' '}
            {formatARS(quote.fee_mp + quote.iva_fee_mp)}. Por Mercado Pago.
          </p>
        </div>
        <div className="rounded-xl border border-brand-green/30 bg-brand-green/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-green">
            Pagás después, al gruero
          </p>
          <p className="mt-1 font-display text-2xl text-brand-green">
            {formatARS(quote.saldo_estimado_gruero)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Subtotal + IVA. En efectivo o transferencia, al finalizar. Los adicionales (peajes,
            espera) se suman aparte.
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        El costo de procesamiento es estimado y configurable. Los importes son en pesos y pueden
        ajustarse por adicionales avisados antes de confirmar.
      </p>
    </div>
  );
}
