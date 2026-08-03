# Flujos — gruafy

## B2C — pedir, pagar, seguir, cerrar

```mermaid
flowchart TD
  A[Cliente crea/elige vehículo] --> B[Origen y destino + ruta]
  B --> C[Presupuesto: pagás ahora vs después]
  C -->|confirma| D[Orden: searching_provider]
  D --> E{¿Hay grúas?}
  E -->|no| Z[no_provider · no se cobra]
  E -->|sí| F[Oferta secuencial 60s por cercanía]
  F -->|acepta| G[awaiting_payment · reserva 180s]
  G -->|paga MP| H[payment_pending]
  H -->|webhook aprobado| I[paid · se revelan datos mutuos]
  G -->|vence| Y[payment_expired → reintento o cierre]
  I --> J[provider_en_route → arrived → vehicle_loaded → in_transit]
  J --> K[completion_pending]
  K --> L[completed + reseña]
```

## B2B — grúa

```mermaid
flowchart TD
  A[Alta: empresa, grúa, conductores, docs] --> B[Enviar a revisión]
  B --> C{Admin revisa}
  C -->|rechaza| D[Corregir y reenviar]
  C -->|aprueba| E[Onboarding operativo]
  E --> F[Disponible + ubicación]
  F --> G[Recibe oferta 60s]
  G -->|acepta atómico| H[Reservado, espera pago]
  H --> I[Pago confirmado: origen exacto + contacto]
  I --> J[Estados: en camino, llegó, cargado, en tránsito, entregado]
  J --> K[Adicionales + finalizar]
```

## Pagos (Mercado Pago)

```mermaid
sequenceDiagram
  participant C as Cliente
  participant S as Servidor gruafy
  participant MP as Mercado Pago
  C->>S: Confirma pago del anticipo
  S->>MP: Crea preference (external_reference = orderId, idempotency)
  MP-->>C: Checkout Pro
  C->>MP: Paga
  MP-->>S: Webhook (x-signature)
  S->>S: Valida firma, request-id, live_mode, moneda, importe
  S->>MP: GET /payments/{id} (server-to-server)
  MP-->>S: Estado real
  S->>S: Idempotente → paid; revela datos; order_events
  Note over S,C: El retorno del navegador NO confirma el pago.
```

## Admin

```mermaid
flowchart LR
  A[Dashboard: buscando/esperando/activos/finalizados] --> B[Proveedores: revisar docs, aprobar/rechazar/suspender]
  A --> C[Servicios: detalle, timeline, asignación manual, cancelación]
  A --> D[Pagos: estado, eventos webhook, reembolso]
  A --> E[Configuración: precios, comisión, tiempos, extras]
  B & C & D & E --> F[admin_audit_logs]
```
