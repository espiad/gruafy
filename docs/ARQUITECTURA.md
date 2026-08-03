# Arquitectura — gruafy

Monolito modular en **Next.js (App Router)** + **Supabase**, desplegable en **Vercel**.
Una sola aplicación con cuatro áreas y una única base de datos con RLS.

## Capas

```
Navegador ──▶ Next.js (App Router)
                ├─ Server Components / Server Actions ──▶ Supabase (Postgres + RLS)
                ├─ Route Handlers /api ─────────────────▶ Mercado Pago (server-to-server)
                └─ Client Components ───────────────────▶ Supabase Realtime, Geoapify, MapLibre
```

- **UI**: React 19, Tailwind con tokens de marca, componentes Radix/shadcn personalizados.
- **Dominio** (`src/features/*`): lógica pura y testeable — `pricing`, `orders` (máquina de estados), `dispatch`, `payments`, `providers`, `tracking`, `reviews`, `support`.
- **Integraciones** (`src/lib/*`): `supabase` (browser/server/admin), `mercadopago`, `geoapify`, `geo`, `validation`, `auth`, `csv`, `env`.
- **Datos**: `supabase/migrations` (esquema, funciones, RLS, storage) + `seed.sql`.

## Áreas y control de acceso

| Área | Rutas | Guard |
|------|-------|-------|
| Pública | `/`, `/como-funciona`, `/simulador`, `/ayuda`, `/legal/*` | ninguno |
| Auth | `/ingresar`, `/registro`, `/registro/proveedor` | ninguno |
| Cliente | `/cliente/*` | middleware + `requireRole(['client'])` en layout |
| Proveedor | `/proveedor/*` | middleware + rol provider + estado de aprobación |
| Admin | `/admin/*` | middleware + `role === 'admin'` |

El middleware (`middleware.ts` → `updateSession`) refresca la sesión SSR y bloquea las áreas
privadas sin sesión. Los layouts de servidor verifican rol; **no se confía en ocultar enlaces**.

## Decisiones estructurales

- **Precios centralizados** en `platform_settings` + snapshot congelado por orden.
- **Máquina de estados** única (`features/orders/state-machine.ts`) con actor autorizado por transición.
- **Aceptación atómica** de ofertas vía RPC `accept_offer` (`SELECT ... FOR UPDATE`).
- **Service role** solo en servidor (`lib/supabase/admin.ts`) para webhooks y despacho.
- **Realtime** por canal `order:<id>` para tracking; **Storage privado** con URLs firmadas.

Ver también `docs/MODELO_DATOS.md`, `docs/FLUJOS.md`, `docs/ESTADOS_ORDEN.md`.
