'use client';

import { useState } from 'react';
import { ShieldCheck, Copy, Check } from 'lucide-react';
import { formatARS } from '@/lib/format';

/**
 * Guía para que el cliente gestione el reintegro/contrafactura con SU seguro.
 * Muchas pólizas cubren el acarreo: el trámite arranca por tener la factura de la
 * grúa. Acá lo guiamos paso a paso y le damos un resumen listo para copiar y
 * adjuntar al reclamo (fecha, recorrido, vehículo e importes).
 */
export function InsuranceGuide({
  orderId,
  originAddress,
  destAddress,
  completedAt,
  vehicle,
  providerName,
  amountUpfront,
  amountService,
}: {
  orderId: string;
  originAddress: string | null;
  destAddress: string | null;
  completedAt: string | null;
  vehicle: string | null;
  providerName: string | null;
  amountUpfront: number | null;
  amountService: number | null;
}) {
  const [copied, setCopied] = useState(false);

  const fecha = completedAt
    ? new Date(completedAt).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
    : '—';
  const total = (amountUpfront ?? 0) + (amountService ?? 0);

  const resumen = [
    `Servicio de acarreo (grúa) — gruafy #${orderId.slice(0, 8)}`,
    `Fecha: ${fecha}`,
    vehicle ? `Vehículo: ${vehicle}` : '',
    originAddress ? `Origen: ${originAddress}` : '',
    destAddress ? `Destino: ${destAddress}` : '',
    providerName ? `Prestador de la grúa: ${providerName}` : '',
    amountService != null ? `Costo del servicio (grúa): ${formatARS(amountService)}` : '',
    amountUpfront != null ? `Anticipo/gestión gruafy: ${formatARS(amountUpfront)}` : '',
    total ? `Total abonado: ${formatARS(total)}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  async function copy() {
    try {
      await navigator.clipboard.writeText(resumen);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* sin portapapeles: el texto igual está visible abajo */
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-brand-green" />
        <h2 className="font-semibold">¿Tu seguro cubre el acarreo? Te ayudamos a recuperarlo</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Muchas pólizas reintegran el costo de la grúa. El trámite arranca por tener la factura.
      </p>
      <ol className="mt-3 space-y-2 text-sm">
        <li className="flex gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-xs font-semibold text-brand-green">1</span>
          <span>Pedí la <strong>factura del servicio</strong> al gruero (botón de arriba) y el comprobante de gruafy.</span>
        </li>
        <li className="flex gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-xs font-semibold text-brand-green">2</span>
          <span>Copiá el <strong>resumen del servicio</strong> de acá abajo con todos los datos del viaje.</span>
        </li>
        <li className="flex gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-xs font-semibold text-brand-green">3</span>
          <span>Presentá factura + resumen a tu seguro (app, mail o teléfono) y pedí el <strong>reintegro por asistencia/acarreo</strong>.</span>
        </li>
      </ol>

      <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 p-3">
        <pre className="whitespace-pre-wrap break-words font-sans text-xs text-muted-foreground">{resumen}</pre>
      </div>
      <button
        onClick={copy}
        className="focus-ring mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-brand-cream"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copiado' : 'Copiar resumen para el seguro'}
      </button>
      <p className="mt-2 text-xs text-muted-foreground">
        Consejo: sacá fotos del vehículo y del lugar; algunas aseguradoras las piden.
      </p>
    </div>
  );
}
