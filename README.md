# gruafy

Plataforma web de asistencia vial on-demand (acarreo con grúa) para AMBA. Conecta conductores
varados con grúas verificadas: pedís, rastreás en vivo y pagás con precio claro antes de aceptar.

**Modelo de plata:** primero una grúa acepta el viaje; recién ahí el cliente paga por Mercado Pago
el anticipo de gruafy (comisión del 20% + fee de MP). El saldo del servicio y los adicionales se le
pagan directo al gruero al finalizar, en efectivo o transferencia.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind con tokens de marca · Radix/shadcn ·
Supabase (Postgres, Auth por cookies SSR, Storage privado, Realtime, RLS) · Mercado Pago
Checkout Pro · MapLibre GL + Geoapify · Web Push (VAPID) · Zod · Vitest · Vercel.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local     # completá tus credenciales
npm run dev                    # http://localhost:3000
```

La landing, `/como-funciona`, `/ayuda` y el `/simulador` andan sin credenciales.

### Base de datos

```bash
supabase link --project-ref <SUPABASE_PROJECT_REF>
supabase db push                       # aplica supabase/migrations/*
psql "$DATABASE_URL" -f supabase/seed.sql
```

Antes de las migraciones, seteá el email de admin y creá un bucket privado `documents`:

```sql
alter database postgres set app.admin_email = 'tu-email@dominio.com';
```

### Scripts

`npm run dev` · `build` (bloquea si falta config productiva) · `typecheck` · `lint` · `test` ·
`db:push`.

## Arquitectura

- `src/app/` — áreas por rol: `(public)` y `(auth)` abiertas, y las privadas `cliente`,
  `proveedor`, `admin`. Cada área privada tiene su layout que exige sesión, rol y cuenta activa.
- `src/features/*` — dominios: `orders`, `providers`, `payments`, `dispatch`, `pricing`,
  `reviews`, `tracking`, `admin`, `account`, `auth`.
- `src/lib/*` — integraciones: `supabase` (clientes server/browser/admin), `mercadopago`,
  `geoapify`, `push`, `env`.

Los tres roles son `client`, `provider_owner` y `admin`. El email de `ADMIN_EMAIL` queda como admin
al registrarse.

## Modelo de datos (tablas centrales)

- `profiles` — un registro por usuario de Auth, con `role` y `status` (active/suspended/deleted).
- `client_profiles`, `vehicles` — datos del cliente B2C y sus autos/motos.
- `provider_accounts`, `provider_members`, `tow_trucks`, `provider_documents` — la grúa, sus
  conductores, sus unidades y la documentación (en el bucket privado).
- `service_orders` — el pedido y su `state`; guarda el `pricing` congelado al crearse.
- `provider_offers` — la oferta a cada grúa, con `unique (order_id, provider_id)`.
- `payments`, `refunds` — anticipos y devoluciones de Mercado Pago.
- `service_extras` — adicionales (peaje, espera, etc.) cargados durante el servicio.
- `order_events`, `order_transitions`, `notifications`, `admin_audit_logs`, `platform_settings`.

## Máquina de estados

El ciclo feliz: `searching_provider → awaiting_payment → paid → provider_en_route →
provider_arrived → vehicle_loaded → in_transit → completion_pending → completed`.

Estados de cierre: `no_provider`, `payment_expired`, `cancelled_by_client/provider/admin`,
`refund_pending`, `refunded`, `disputed`.

Las transiciones válidas viven en la tabla `order_transitions` y las hace cumplir el trigger
`enforce_order_update`: cualquier cambio de estado no declarado se rechaza a nivel base, incluso con
service role. La asignación de la grúa es atómica: el RPC `accept_offer` bloquea la fila del pedido
(`for update`) y verifica que quien acepta sea miembro de esa grúa, así dos grúas que aceptan a la
vez no producen doble asignación.

## Precios

El motor está en `src/features/pricing`. El presupuesto sale de: movida base + km recorridos +
dollys (si hay ruedas trabadas). Sobre ese subtotal, gruafy cobra una comisión (20% por defecto)
como anticipo; el fee de Mercado Pago y su IVA se suman al anticipo. Los parámetros los edita el
admin desde Configuración y quedan versionados; el `pricing` de cada orden se congela al crearse, así
que cambiar los parámetros no afecta pedidos ya tomados.

## Seguridad

Autorización en dos capas: RLS en Postgres como base, más chequeos en cada server action (usuario
autenticado + propiedad del recurso, o admin). El service role solo se usa en el servidor para
operaciones controladas (webhook de pago, asignación, acciones de admin). Los adicionales tienen un
trigger propio (`enforce_extra_integrity`) que impide cargar montos fuera del catálogo o sobre un
servicio cerrado. El webhook de Mercado Pago valida la firma HMAC y falla cerrado si falta el
secreto; el cron de barrido exige `CRON_SECRET`.

## Mercado Pago

Checkout Pro con `PAYMENTS_MODE` (test/production). El retorno del navegador no confirma el pago: la
verdad llega por webhook (`/api/payments/webhook`), que reconcilia contra la API de MP. En producción
el arranque falla si faltan credenciales productivas, datos legales o URL HTTPS (ver `src/lib/env.ts`).
Para demos sin mover plata hay un pago simulado que el admin enciende desde Configuración.

## Deploy

Vercel + Supabase + webhook de MP apuntando a `https://<dominio>/api/payments/webhook`. Las
variables de entorno productivas se cargan en Vercel. `.env.example` lista todas las que hacen falta.

## Marca

`gruafy` siempre en minúscula. Naranja `#FF9E00`, verde `#1C3C36`, negro verdoso `#001910`, blanco
cálido `#F8F7F4`. Tipografías Zen Dots (identidad) y Poppins (interfaz).
