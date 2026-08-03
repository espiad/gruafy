'use client';

import { FileText, Receipt } from 'lucide-react';
import { publicEnv } from '@/lib/env';
import { formatARS } from '@/lib/format';

/**
 * Al cerrar el servicio, el cliente puede pedir el comprobante:
 *  - la factura del servicio, directo al WhatsApp del proveedor;
 *  - el comprobante de gruafy (comisión), al WhatsApp de soporte.
 * Van con un mensaje pre-armado (pedido + importes) para no perder tiempo.
 */
export function InvoiceButtons({
  orderId,
  providerPhone,
  providerName,
  amountUpfront,
  amountService,
}: {
  orderId: string;
  providerPhone: string | null;
  providerName: string | null;
  amountUpfront: number | null;
  amountService: number | null;
}) {
  const shortId = orderId.slice(0, 8);
  const providerDigits = (providerPhone ?? '').replace(/\D/g, '');
  const support = publicEnv.whatsapp;

  const serviceMsg = encodeURIComponent(
    [
      `Hola${providerName ? ` ${providerName}` : ''} 👋`,
      `Te escribo por el servicio de gruafy #${shortId}.`,
      amountService ? `Total del servicio: ${formatARS(amountService)}.` : '',
      'Necesito la factura del servicio, gracias.',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  const gruafyMsg = encodeURIComponent(
    [
      'Hola gruafy 👋',
      `Necesito el comprobante de la comisión del pedido #${shortId}.`,
      amountUpfront ? `Anticipo pagado: ${formatARS(amountUpfront)}.` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">Comprobantes</h2>
      <p className="text-xs text-muted-foreground">Pedí tu factura sin vueltas, con los datos ya cargados.</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {providerDigits && (
          <a
            href={`https://wa.me/${providerDigits}?text=${serviceMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring flex items-center justify-center gap-2 rounded-lg border border-input py-2.5 text-sm font-medium hover:bg-accent"
          >
            <FileText className="h-4 w-4" /> Factura del servicio
          </a>
        )}
        {support && (
          <a
            href={`https://wa.me/${support}?text=${gruafyMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring flex items-center justify-center gap-2 rounded-lg border border-input py-2.5 text-sm font-medium hover:bg-accent"
          >
            <Receipt className="h-4 w-4" /> Comprobante de gruafy
          </a>
        )}
      </div>
    </div>
  );
}
