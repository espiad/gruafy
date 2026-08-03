# Pendientes reales (bloqueos externos) — gruafy

Solo cosas que **no** puedo resolver sin una acción tuya. Todo lo demás se sigue construyendo.

## Credenciales a cargar en `.env.local` (y luego en Vercel)

| Variable | Cómo obtenerla |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o `ANON_KEY`) | Crear proyecto en supabase.com → Settings → API. |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `DATABASE_URL` | Mismo panel de Supabase (Settings → API / Database). |
| `MERCADOPAGO_TEST_ACCESS_TOKEN`, `NEXT_PUBLIC_MERCADOPAGO_TEST_PUBLIC_KEY` | mercadopago.com.ar → Tus integraciones → Credenciales de **prueba**. |
| `MERCADOPAGO_PRODUCTION_ACCESS_TOKEN`, `NEXT_PUBLIC_MERCADOPAGO_PRODUCTION_PUBLIC_KEY` | Credenciales de **producción** (solo tras aprobar pruebas). |
| `MERCADOPAGO_WEBHOOK_SECRET` | Al configurar el webhook en el panel de MP. |
| `NEXT_PUBLIC_GEOAPIFY_API_KEY` | geoapify.com → API Keys (plan gratuito alcanza para dev). |
| `ADMIN_EMAIL` | Tu email; el usuario con ese email queda como admin. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_SUPPORT_EMAIL` | Datos de contacto de soporte. |

## Datos legales (obligatorios para producción)

- `NEXT_PUBLIC_LEGAL_NAME` (razón social real) y `NEXT_PUBLIC_LEGAL_CUIT`.
- `NEXT_PUBLIC_LEGAL_ADDRESS`, `NEXT_PUBLIC_LEGAL_EMAIL`.

Mientras falten, la app funciona en desarrollo con placeholders y el **build de producción se bloquea**
de forma explícita (`productionReadiness()` en `src/lib/env.ts`).

## Acciones que requieren tus cuentas (no puedo hacerlas por vos)

- Crear el proyecto Supabase, correr migraciones (`supabase db push`) y crear el bucket privado `documents`.
- Configurar el webhook de Mercado Pago apuntando a `https://<tu-dominio>/api/payments/webhook`.
- Conectar el repo a Vercel y cargar las variables de entorno de producción.
- Validar los flujos con credenciales de **prueba** de MP antes de pasar a producción.
