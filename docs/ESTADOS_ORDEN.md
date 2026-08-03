# Estados de la orden — gruafy

Fuente: `src/features/orders/state-machine.ts` (con tests en `tests/unit/state-machine.test.ts`).
Cada transición define actor autorizado y evento; se registra en `order_events`.

## Diagrama

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> quoted
  quoted --> searching_provider
  searching_provider --> provider_reserved: gruero acepta
  searching_provider --> no_provider: sin grúas
  provider_reserved --> awaiting_payment
  awaiting_payment --> payment_pending
  awaiting_payment --> paid: webhook aprobado
  awaiting_payment --> payment_expired
  payment_pending --> paid
  payment_pending --> payment_expired
  payment_expired --> searching_provider: reintento
  paid --> provider_en_route
  provider_en_route --> provider_arrived
  provider_arrived --> vehicle_loaded
  vehicle_loaded --> in_transit
  in_transit --> completion_pending
  completion_pending --> completed
  completion_pending --> disputed
  paid --> refund_pending
  refund_pending --> refunded
  searching_provider --> cancelled_by_client
  provider_reserved --> cancelled_by_provider
  paid --> cancelled_by_provider
  note right of paid: cancelable por admin desde\ncualquier estado activo
  completed --> [*]
  no_provider --> [*]
  refunded --> [*]
```

## Estados terminales
`completed`, `no_provider`, `payment_expired`, `cancelled_by_client`, `cancelled_by_provider`,
`cancelled_by_admin`, `refunded`.

## Actores
- `client`: inicia búsqueda, cancela antes del inicio, disputa, califica.
- `provider`: acepta (atómico), avanza el recorrido, carga adicionales.
- `admin`: asigna/cancela, aprueba proveedores, reembolsa.
- `system`: confirma pago (webhook), expira, marca sin proveedor.

Reglas clave: nunca se actualiza el estado desde el cliente sin pasar por la máquina; se previenen
saltos inválidos; la aceptación es atómica (RPC `accept_offer`).
