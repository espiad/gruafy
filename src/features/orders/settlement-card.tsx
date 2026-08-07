import { Wallet, CheckCircle2 } from 'lucide-react';
import { formatARS } from '@/lib/format';

export interface SettlementExtra {
  id: string;
  category: string;
  reason: string;
  amount: number;
  status: 'auto_approved' | 'needs_review' | 'approved' | 'rejected';
}

/**
 * Liquidación del servicio, estilo Uber: le dice al cliente cuánto pagarle al
 * gruero AHORA, con el desglose (saldo base + adicionales) y el TOTAL bien grande.
 * Solo suman al total los adicionales aprobados (auto_approved/approved); los que
 * están en revisión se muestran aparte y no se cobran hasta resolverse.
 */
export function SettlementCard({
  saldoBase,
  extras,
  role,
  anticipo,
}: {
  saldoBase: number;
  extras: SettlementExtra[];
  role: 'cliente' | 'gruero';
  anticipo?: number | null;
}) {
  // Todos los adicionales cargados suman: ya no existen estados intermedios.
  const approved = extras.filter((e) => e.status !== 'rejected');
  const extrasTotal = approved.reduce((a, e) => a + e.amount, 0);
  const totalGruero = saldoBase + extrasTotal;

  return (
    <div className="rounded-2xl border-2 border-brand-green bg-brand-green/5 p-5">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-brand-green" />
        <h2 className="font-semibold">
          {role === 'cliente' ? 'Pagale al gruero al finalizar' : 'A cobrar al cliente'}
        </h2>
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Servicio (subtotal + IVA)</dt>
          <dd className="tabular-nums">{formatARS(saldoBase)}</dd>
        </div>
        {approved.map((e) => (
          <div key={e.id} className="flex justify-between">
            <dt className="text-muted-foreground">
              {e.category}
              {e.reason ? ` — ${e.reason}` : ''}
            </dt>
            <dd className="tabular-nums">{formatARS(e.amount)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex items-baseline justify-between border-t border-brand-green/20 pt-3">
        <span className="font-semibold">Total al gruero</span>
        <span className="font-display text-2xl text-brand-green">{formatARS(totalGruero)}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        En efectivo o transferencia, directo al gruero.
        {anticipo != null && ` El anticipo de ${formatARS(anticipo)} ya lo pagaste por Mercado Pago.`}
      </p>


      {role === 'cliente' && anticipo != null && (
        <p className="mt-3 flex items-center gap-1 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Total del servicio: {formatARS((anticipo ?? 0) + totalGruero)}
        </p>
      )}
    </div>
  );
}
