# Mercado Pago — gruafy

Se cobra por adelantado **solo el anticipo de gruafy** (20% del subtotal + fee de procesamiento +
su IVA). El saldo del servicio se paga directo al gruero, fuera de Mercado Pago.

## Flujo

1. El gruero acepta → la orden pasa a `awaiting_payment` con `payment_deadline`.
2. El cliente toca «Pagar» → `POST /api/payments/create` crea la **preference** (solo servidor) con:
   - `external_reference = orderId`, `idempotencyKey` por operación,
   - `notification_url = <APP_URL>/api/payments/webhook`,
   - `back_urls` (aprobada/pendiente/fallida), `expires` según el deadline, `binary_mode`.
3. El navegador va a Checkout Pro. **El retorno del navegador NO confirma el pago.**
4. Mercado Pago llama al **webhook**. Se verifica la firma y se consulta el pago server-to-server.

## Webhook (`/api/payments/webhook`)

- Verifica `x-signature` (HMAC-SHA256 sobre `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`) con
  `MERCADOPAGO_WEBHOOK_SECRET`. Firma inválida → 401.
- Consulta `GET /payments/{id}` (única fuente de verdad).
- **Idempotente**: si el pago ya está en su estado final, no reprocesa.
- Valida **importe** y **moneda** (ARS) contra la orden antes de aprobar.
- Aprueba la orden (`paid`) solo si el pago está `approved`, con importe/moneda correctos y la orden
  en `awaiting_payment`/`payment_pending`. Registra el evento.
- Responde rápido (200) y difiere errores no críticos para no romper reintentos.

## Estados de pago

`created · pending · approved · rejected · cancelled · refunded · expired`.

## Reembolsos

Desde `/admin/pagos` con **doble confirmación** y motivo. Registra en `refunds`, intenta el reembolso
en MP; si falla queda `pending`/`refund_pending` para reintento. Todo auditado.

## Casos cubiertos

Preferencia no creada · pago rechazado/pendiente · webhook duplicado · firma inválida · monto
distinto · pago aprobado tras vencer · cancelación post-pago · reembolso fallido · cierre y reapertura
de pestaña. Ninguno deja la orden en un estado imposible.

## Test vs producción

`PAYMENTS_MODE=test` usa credenciales de prueba; en producción se fuerza `production` y se exige URL
HTTPS + credenciales productivas (ver `productionReadiness()`). Diagnóstico en `/admin/configuracion`
(muestra presente/ausente, nunca el secreto).
