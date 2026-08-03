# Seguridad — gruafy

## Autenticación y sesión
- Supabase Auth con cookies SSR (HttpOnly, SameSite) vía `@supabase/ssr`.
- Middleware refresca sesión y bloquea `/cliente`, `/proveedor`, `/admin` sin sesión.
- Rol verificado en servidor (`requireRole`, `is_admin()` en RLS). El rol admin se asigna solo por
  `ADMIN_EMAIL` (trigger `handle_new_user`); nunca desde el cliente.

## Row Level Security
- RLS activo en **todas** las tablas de la app (ver `0003_rls.sql`).
- Cada quien ve/edita lo suyo. **Antes del pago** el proveedor no ve el origen exacto ni el contacto
  del cliente, y el cliente no ve datos privados del proveedor.
- Helpers `is_admin`, `is_provider_member` con `SECURITY DEFINER` para evitar recursión.
- La **service role key** solo se usa en servidor (`lib/supabase/admin.ts`), jamás en el navegador.

## Pagos
- Preferencia creada solo en servidor; webhook con firma verificada e idempotencia; confirmación por
  consulta server-to-server. No se almacenan datos de tarjeta.

## Datos y archivos
- Documentos en bucket **privado**; acceso por **URL firmada** de corta duración (120 s).
- Uploads: MIME permitido (imagen/PDF) y tamaño máximo (8 MB); nombre de archivo saneado.
- No se loguean tokens, claves ni payloads sensibles completos.

## Validación
- **Zod** en los límites de confianza (server actions, route handlers).
- Validaciones AR reales: CUIT con dígito verificador, DNI, patente (viejo/Mercosur), vencimientos.
- TypeScript **strict**, sin `any` injustificados.

## Cabeceras y transporte
- Cabeceras de seguridad en `next.config.mjs` (X-Frame-Options, nosniff, Referrer-Policy,
  Permissions-Policy con geolocation self).
- HTTPS forzado en producción (candado `productionReadiness`).

## Auditoría
- Toda acción administrativa (aprobaciones, rechazos, reembolsos, cambios de settings, cancelaciones)
  queda en `admin_audit_logs` con antes/después sanitizado.

## Pendientes recomendados para escala
- Rate limiting persistente en endpoints sensibles (hoy la superficie está acotada por auth + RLS).
- Web Push real si se quiere notificación en segundo plano (no se promete si no está configurado).
