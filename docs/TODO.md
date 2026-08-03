# TODO — gruafy

Pendientes que **no bloquean** la demo ni el uso. El recorrido completo funciona sin esto.

## Pendiente

### Legales (dar bola siempre)
- [ ] **T&C explícito en el alta**: checkbox obligatorio con link a `/legal/*` al registrarse (cliente y proveedor), guardando versión + timestamp de aceptación.
- [ ] **Cliente B2C — DNI** al registrarse (guardar en `client_profiles.dni`).
- [ ] **Declaración/resguardo**: checkbox simple del cliente para resguardo de la operación y de quien presta el auxilio (no es trámite pesado, solo la aceptación registrada).
- [ ] **Razón social + CUIT + datos fiscales reales** antes del deploy productivo (hoy con placeholders, candado activo).
- [ ] **Comprobante/factura**: hoy se piden por WhatsApp (al proveedor y a soporte). A futuro, emisión formal si corresponde.


- [ ] **E2E Playwright** — pruebas automáticas del recorrido completo (visitante → pedido → aceptación
      → pago de prueba → tracking → cierre → reseña; y acceso no autorizado). Recorridos definidos en
      `docs/PRUEBAS.md`. **Requiere credenciales de prueba de Supabase + Mercado Pago** para correr.
- [ ] **Panel de notificaciones (campana)** — ícono con contador y lista desplegable. El backend ya
      existe (tabla `notifications` + generación de eventos); falta el componente de UI en el header
      de las áreas privadas. No requiere credenciales.
- [ ] **Invitación de conductores por email** — hoy el dueño carga al conductor y el admin asocia la
      cuenta autenticada. Falta el flujo de invitación por email (depende de la entrega de correo de
      Supabase Auth).
- [ ] **Credenciales de Mercado Pago** (test y luego producción) — el flujo de pago no corre hasta cargarlas.
- [ ] **Datos que el propietario decidió posponer** (se omiten con elegancia en la UI, sin textos de
      "no tenemos"): email de soporte visible, email de contacto legal, razón social,
      **CUIT y cualquier dato fiscal**. Requeridos antes del deploy productivo (el build de producción
      se bloquea hasta cargarlos; en desarrollo/preview funciona igual).
- [ ] **Credenciales de deploy** — o bien `VERCEL_TOKEN` + `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` (para
      deploy por CLI), o conectar el repo desde el panel de Vercel. Ver más abajo.

## Hecho
Todo lo demás (4 áreas, auth+RLS, precios, estados, Mercado Pago, despacho, tracking, storage, admin,
legales, tests unitarios, seed demo, docs). Ver `docs/ESTADO.md`.
