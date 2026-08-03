# gruafy

Plataforma web de **asistencia vial on-demand** (acarreo con grúa) que conecta conductores varados
con grúas verificadas en AMBA. Como Uber, pero con grúas: pedís, rastreás y resolvés, con precio
claro antes de aceptar y sin letra chica.

> Primero una grúa acepta el viaje; recién ahí el cliente paga por Mercado Pago el **anticipo del 20%**
> de gruafy. El saldo del servicio y los adicionales se pagan directo al gruero al finalizar.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind (tokens de marca) · Radix/shadcn ·
Supabase (Postgres, Auth, Storage privado, Realtime, RLS) · Mercado Pago Checkout Pro ·
MapLibre GL + Geoapify · Zod · React Hook Form · Vitest · Playwright · Vercel.

## Requisitos

- Node.js 20+ y npm.
- Cuenta de Supabase, Mercado Pago (test y producción) y Geoapify. Ver `docs/PENDIENTES_REALES.md`.

## Puesta en marcha (local)

```bash
npm install
cp .env.example .env.local     # completá tus credenciales
npm run dev                    # http://localhost:3000
```

La landing, `/como-funciona`, `/ayuda` y el `/simulador` funcionan sin credenciales
(el simulador usa Geoapify si está configurado, o una estimación por distancia si no).

### Base de datos (Supabase)

```bash
# Con Supabase CLI y un proyecto creado:
supabase link --project-ref <SUPABASE_PROJECT_REF>
supabase db push               # aplica supabase/migrations/*
# Cargar seed base (settings + ayuda):
psql "$DATABASE_URL" -f supabase/seed.sql
```

Antes de correr las migraciones, configurá el email de admin en el proyecto:

```sql
alter database postgres set app.admin_email = 'tu-email@dominio.com';
```

Creá un bucket **privado** llamado `documents` para la documentación de proveedores.

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Build de producción (bloquea si falta config productiva). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint. |
| `npm run test` | Vitest (unit + integración). |
| `npm run test:e2e` | Playwright (E2E). |
| `npm run db:push` | Aplica migraciones. |

## Estructura

Ver `docs/IMPLEMENTATION_PLAN.md`. Dominios en `src/features/*`, integraciones en `src/lib/*`,
áreas de la app en `src/app/(public|auth)`, `cliente`, `proveedor`, `admin`.

## Documentación

- `docs/DECISIONES.md` — decisiones y contradicciones resueltas.
- `docs/MODELO_DATOS.md` — esquema + diagrama.
- `docs/FLUJOS.md` — flujos B2C, B2B, pagos y admin.
- `docs/ESTADO.md` — qué está hecho y qué falta.
- `docs/PENDIENTES_REALES.md` — credenciales y acciones que requieren al propietario.

## Deploy

Vercel + Supabase + webhook de Mercado Pago. Pasos detallados (a completar) en `docs/DEPLOY.md`.
`PAYMENTS_MODE=production` exige credenciales productivas y URL HTTPS válida; el arranque falla de
forma explícita si falta algo (ver `src/lib/env.ts`).

## Marca

`gruafy` se escribe siempre en minúscula. Paleta: naranja `#FF9E00`, verde `#1C3C36`, negro verdoso
`#001910`, blanco cálido `#F8F7F4`. Tipografías: Zen Dots (identidad) y Poppins (interfaz).
