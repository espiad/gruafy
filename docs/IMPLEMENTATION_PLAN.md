# Plan de implementación — gruafy

Orden por prioridad del prompt maestro. Estado detallado en `docs/ESTADO.md`.

## P0 — recorrido completo
1. **Inicialización y branding** — Next.js + TS strict, Tailwind con tokens de marca, fuentes Zen Dots/Poppins, logo fiel, layout público, landing, header/footer. ✅
2. **Supabase, auth, roles y RLS** — esquema completo, funciones, RLS, clientes SSR, middleware de sesión, promoción segura de admin. 🟡 (esquema + clientes listos; auth UI y middleware en curso)
3. **Precios, vehículos y creación de orden** — motor de precios + `platform_settings` + simulador público. ✅ precios/simulador · 🟡 formulario de pedido autenticado
4. **Proveedor, disponibilidad y asignación** — disponibilidad, oferta secuencial 60s, `accept_offer` atómico. 🟡 (RPC atómico listo; UI de proveedor pendiente)
5. **Mercado Pago y webhooks** — preference server-side, webhook con verificación de firma, idempotencia. 🟡 (lib y contrato definidos; endpoints pendientes)
6. **Tracking y estados** — MapLibre + Realtime + máquina de estados. 🟡 (state machine lista; mapa y realtime pendientes)
7. **Cierre y reseña** — comprobante, reseña, historial. ⬜

## P1 — control y entrega
8. Onboarding documental B2B (uploads privados + URLs firmadas). ⬜
9. Admin completo (dashboard, proveedores, servicios, pagos, config, auditoría). ⬜
10. Extras, reembolsos e historial. ⬜
11. Landing, simulador, ayuda y legales. ✅ landing/simulador/ayuda · 🟡 legales (borrador)

## P2 — calidad
12. Tests (Vitest unit + integración, Playwright E2E), responsive, accesibilidad, errores. 🟡 (unit de precios/validaciones/estados en curso)
13. Deploy, variables productivas y webhook. ⬜ (requiere credenciales del propietario)
14. Documentación y guía de demo. 🟡

## Arquitectura de carpetas

```
src/
  app/            (public) (auth) cliente proveedor admin api
  components/     brand ui forms maps orders provider admin
  features/       pricing orders dispatch payments tracking providers reviews notifications support
  lib/            supabase mercadopago geoapify auth validation security env format utils
  types/
supabase/         migrations seed.sql
docs/  tests/  public/brand
```
