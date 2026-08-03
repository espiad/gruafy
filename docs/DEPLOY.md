# Deploy — gruafy

Objetivo: dejar gruafy navegable en producción con Vercel + Supabase + webhook de Mercado Pago.

## 1. Supabase
1. Crear proyecto en supabase.com.
2. Configurar el email de admin (para la promoción automática):
   ```sql
   alter database postgres set app.admin_email = 'tu-email@dominio.com';
   ```
3. Aplicar migraciones y seed:
   ```bash
   supabase link --project-ref <SUPABASE_PROJECT_REF>
   supabase db push
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```
4. Verificar que existe el bucket privado `documents` (lo crea `0004_storage.sql`).
5. En Auth → URL configuration, agregar la URL del sitio y el redirect `/auth/callback`.

## 2. Variables de entorno (Vercel)
Cargar todas las de `.env.example`. Para producción, además:
- `NODE_ENV=production`, `DEMO_MODE=false`, `PAYMENTS_MODE=production`.
- `NEXT_PUBLIC_APP_URL=https://<tu-dominio>` (HTTPS).
- Credenciales **productivas** de Mercado Pago + `MERCADOPAGO_WEBHOOK_SECRET`.
- `NEXT_PUBLIC_LEGAL_NAME` y `NEXT_PUBLIC_LEGAL_CUIT` reales (si faltan, el build se bloquea).
- `NEXT_PUBLIC_GEOAPIFY_API_KEY`, `ADMIN_EMAIL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`.

## 3. Mercado Pago
1. En el panel de MP, crear la aplicación y obtener credenciales de prueba y producción.
2. Configurar el webhook apuntando a `https://<tu-dominio>/api/payments/webhook` y guardar el secreto
   en `MERCADOPAGO_WEBHOOK_SECRET`.
3. Validar el flujo completo con credenciales de **prueba** antes de pasar a producción.

## 4. Vercel
1. Importar el repo en Vercel.
2. Cargar las variables de entorno.
3. Deploy. El build corre `next build` (falla si falta configuración productiva crítica).

## 5. Admin
Registrar la cuenta con el email de `ADMIN_EMAIL` desde `/registro`: queda promovida a admin.

## 6. Verificación post-deploy
- `/admin/configuracion` → diagnóstico en verde (Supabase, Geoapify, MP, legales, DEMO_MODE off).
- Recorrido de prueba con credenciales de test de MP.
- Consola del navegador y red sin errores.

## Checklist Definition of Done
Ver `docs/ESTADO.md` y la sección Definition of Done del prompt maestro.
