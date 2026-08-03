# Guía de demo — gruafy (5–10 min)

Recorrido de exposición end-to-end. Ideal con `npm run seed:demo` corrido en un entorno de prueba.

## Preparación
- Cargar `.env.local` (Supabase + Mercado Pago **test** + Geoapify).
- `npm run db:push` y `psql "$DATABASE_URL" -f supabase/seed.sql`.
- `npm run seed:demo` (crea usuarios y órdenes de ejemplo). Contraseña demo: `gruafy-demo-2026`.
- Registrar el admin con el email de `ADMIN_EMAIL` desde `/registro`.

## Guion (2 pestañas: cliente y proveedor)

1. **Landing y marca** (30 s). Mostrar `/` — hero, tres pasos, ventajas. Destacar branding aprobado.
2. **Simulador** (1 min). En `/simulador`, mover la distancia: se ve el desglose «Pagás ahora / Pagás
   después». Recalcá que gruafy cobra el 20% anticipado y el resto va al gruero.
3. **Cliente pide** (1–2 min). Ingresar como `cliente.demo@gruafy.com`. `/cliente/solicitar`: elegir
   vehículo, origen/destino, condiciones, aceptar términos → «Buscar grúa». Queda `searching_provider`.
4. **Proveedor acepta** (1 min). En la otra pestaña, `grua.demo@gruafy.com` en `/proveedor`: ponerse
   disponible, ver la oferta con cuenta regresiva y **Aceptar**. La orden pasa a `awaiting_payment`.
5. **Cliente paga** (1–2 min). Volver al cliente, `/cliente/solicitudes/<id>` → «Pagar». Completar en
   Checkout Pro con tarjeta de **prueba**. El webhook confirma → `paid`, se revelan los datos.
6. **Tracking y estados** (1 min). El proveedor avanza estados (en camino → llegó → cargado → en
   tránsito → entregado → finalizado); el cliente ve el mapa y el timeline en vivo.
7. **Cierre y reseña** (30 s). Con el servicio finalizado, el cliente deja una reseña (estrellas).
8. **Admin** (1–2 min). Ingresar como admin: `/admin` (dashboard), `/admin/proveedores/<id>` (revisar
   documentos con URL firmada, aprobar/rechazar), `/admin/pagos` (estado + reembolso), y
   `/admin/configuracion` (precios versionados + diagnóstico).

## Puntos a resaltar
- Primero acepta el gruero, después paga el cliente.
- El pago se confirma por webhook verificado, no por el retorno del navegador.
- Antes del pago no se cruzan datos privados; RLS lo garantiza.
- Documentos privados servidos por URL firmada.

## Si algo falla
Con credenciales de test todo funciona local. Sin Geoapify, el simulador estima por distancia y el
mapa cae a OSM. Sin Supabase/MP, las áreas privadas muestran estados vacíos claros (no datos falsos).
