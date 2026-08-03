# Decisiones de arquitectura y producto — gruafy

Registro de decisiones y de contradicciones detectadas entre las fuentes. Prioridad
de fuentes: (1) prompt maestro, (2) pretesis aprobada, (3) MVP/User stories/Roadmap/Stack,
(4) manuales de identidad, (5) legales como borrador.

## Contradicciones detectadas y resolución

| # | Tema | Fuente A | Fuente B | Decisión |
|---|------|----------|----------|----------|
| 1 | Comisión de gruafy | `MVP GRUAFY.docx` y `T&C`: **15% neto** | Prompt maestro + propietario: **20%** | **20% del subtotal estimado**, cobrado anticipado. Los docs viejos quedan derogados. |
| 2 | Stack | `Stack_Tecnologico_Gruafy.pdf`: React Native/Expo + Express + MongoDB + Redis/BullMQ + Cloudinary | Prompt maestro: Next.js + Supabase + Vercel | **Next.js + Supabase**, 100% web responsive. Sin RN/Expo/Mongo/Express/Redis. |
| 3 | Momento del pago | User story B2C: "flujo de 3 pantallas + pago" | Prompt maestro: gruero acepta primero | **Primero acepta el gruero**, después el cliente paga el anticipo. |
| 4 | Base de comisión | MVP: 15% "sin IVA del gruero" | Prompt maestro: fórmulas explícitas | Se usan las fórmulas del maestro (comisión = 20% del subtotal sin IVA; fee MP 6,29% + IVA solo sobre la comisión). |
| 5 | Login | User story: "Login con Google" obligatorio | Prompt maestro: email/password, Google opcional | **Email/contraseña** base; Google OAuth opcional si se aportan credenciales. |
| 6 | "Factura" al cierre | MVP menciona invoice/factura | Prompt maestro: no llamar factura fiscal | Se emite **comprobante/resumen**, no factura fiscal. |

## Decisiones cerradas (del prompt maestro)

- Marca siempre en minúscula: `gruafy`.
- Único servicio: **acarreo con grúa**. Zona: **AMBA**.
- 1 cuenta de proveedor = 1 grúa; hasta 5 conductores.
- Proveedores y documentos validados **manualmente** por admin, con validaciones de formato automáticas mínimas.
- Anticipo de gruafy (20%) por Mercado Pago; saldo y adicionales directo al gruero, fuera de MP.
- Confirmación de pago **solo por webhook autenticado + consulta server-to-server**; el retorno del navegador no confirma.

## Decisiones tomadas en esta implementación

- **Monolito modular Next.js (App Router)** con cuatro áreas por route groups: `(public)`, `(auth)`, `cliente`, `proveedor`, `admin`.
- **Precios en `platform_settings`** (una fila versionada) + snapshot congelado por orden en `service_orders.pricing`. Nada de constantes dispersas.
- **Redondeo de km**: se redondea hacia arriba al paso configurable (`km_redondeo`, default 1 km), con mínimo 1 km. Documentado en `src/features/pricing/pricing.ts`.
- **Máquina de estados centralizada** en `src/features/orders/state-machine.ts`; cada transición valida actor y se registra en `order_events`.
- **Aceptación atómica** de ofertas vía RPC `accept_offer` con `SELECT ... FOR UPDATE` para prevenir doble aceptación.
- **RLS en todas las tablas**; helpers `is_admin`, `is_provider_member` con `SECURITY DEFINER` para evitar recursión.
- **Datos legales**: por decisión del propietario se usan **placeholders de desarrollo**. El build de producción se **bloquea** (`productionReadiness()` en `src/lib/env.ts`) hasta cargar razón social + CUIT reales y demás config crítica.
- **DEMO_MODE**: habilita simulador de ubicación y atajos de QA solo fuera de producción.

## Pendiente de definición del propietario

Ver también `docs/PENDIENTES_REALES.md`.

- Razón social y CUIT reales (para legales productivos y footer).
- Credenciales: Supabase, Mercado Pago (test y producción), Geoapify, `ADMIN_EMAIL`, WhatsApp de soporte.
- Dominio productivo (el `Stack` viejo mencionaba `gruafy.com`).
