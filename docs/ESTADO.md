# Estado del proyecto — gruafy

Actualizado durante el desarrollo. Leyenda: ✅ hecho · 🟡 en curso · ⬜ pendiente.

## Hecho (verificado)
- ✅ Proyecto Next.js 15 + React 19 + TS **strict** (`tsc --noEmit` limpio, `next build` OK, 15 páginas).
- ✅ Sistema de marca: tokens Tailwind (naranja/verde/ink/cream), fuentes Zen Dots + Poppins, patrones (líneas, barras).
- ✅ Logo fiel al aprobado (isotipo ✓ + chevron) como componente SVG.
- ✅ Landing pública con hero, 3 pasos, ventajas, CTA simulador y FAQ.
- ✅ Header/footer, `/como-funciona`, `/ayuda` + `/ayuda/[slug]` (búsqueda y filtro por rol).
- ✅ **Simulador público** funcional con motor de precios (desglose "pagás ahora / pagás después"); usa Geoapify si está configurado o estimación por distancia si no.
- ✅ Motor de precios (`features/pricing`) con fórmulas del prompt (comisión 20%, fee MP, IVA) y redondeo de km documentado.
- ✅ Máquina de estados de orden (21 estados, transiciones, actores, etiquetas).
- ✅ Validaciones AR: CUIT (dígito verificador), DNI, patente (viejo/Mercosur), año, teléfono, vencimientos.
- ✅ Migraciones Supabase: esquema (19 tablas), funciones/triggers (`accept_offer` atómico, límite de conductores, promoción admin), **RLS en todas las tablas**.
- ✅ Seed base (settings de precio + 8 artículos de ayuda).
- ✅ Clientes Supabase (browser/server SSR/admin service-role) y tipos de DB.
- ✅ `.env.example` completo, candado de producción (`productionReadiness`), headers de seguridad.
- ✅ Docs: DECISIONES, MODELO_DATOS, FLUJOS, IMPLEMENTATION_PLAN, ESTADO.
- ✅ **Auth completo**: middleware SSR con refresco de sesión + guards por rol, páginas `/ingresar`, `/registro`, `/registro/proveedor` (formularios con degradación si falta Supabase), callback de confirmación de email, helpers `requireUser`/`requireRole`.
- ✅ **Área cliente**: layout con shell responsive (sidebar/bottom-nav), dashboard con servicio activo, **asistente de pedido en 3 pasos** (`/cliente/solicitar`) con motor de precios en vivo, detalle de solicitud con timeline + botón de pago + revelado de datos post-pago, historial, vehículos, perfil editable.
- ✅ **Mercado Pago**: creación de preference server-side (`/api/payments/create`) con external_reference + idempotency + expiración; **webhook** (`/api/payments/webhook`) con verificación de firma HMAC (`x-signature`), consulta server-to-server e idempotencia; reconciliación que valida importe/moneda y avanza la orden a `paid`.
- ✅ Server actions de órdenes (crear con snapshot congelado, cancelar) y de perfil.
- ✅ Verificado: `tsc` limpio, `next build` OK (26 rutas), auth UI renderizada con branding fiel.

- ✅ **Área proveedor completa**: onboarding (empresa + grúa), estado de solicitud con **subida de documentos a Storage privado** (validación MIME/tamaño) y envío a revisión, panel con **disponibilidad + geolocalización**, **ofertas con cuenta regresiva** (aceptar/rechazar), panel de servicio con **acciones de estado validadas**, adicionales con tope, historial, equipo, perfil.
- ✅ **Despacho**: `dispatchOrder` busca proveedores aprobados/disponibles/cercanos (haversine, radio configurable), genera **ofertas secuenciales escalonadas**; sin proveedores → `no_provider` sin cobrar. Aceptación **atómica** vía RPC `accept_offer`.
- ✅ **Tracking**: `LocationSender` (proveedor comparte ubicación por Realtime + persiste, con aviso de permisos), `TrackingMap` **MapLibre** con origen/destino y grúa en vivo por canal `order:<id>` (usa Geoapify o fallback OSM). Integrado en el detalle del cliente.
- ✅ Migración de Storage (bucket privado `documents` + políticas por carpeta de proveedor).
- ✅ Verificado: `tsc` limpio, `next build` OK (32 rutas).

- ✅ **Panel admin completo**: dashboard con métricas por estado; **revisión de proveedores** (documentos vía **URL firmada**, aprobar/rechazar/suspender con motivo obligatorio); servicios con detalle, timeline, desglose y **cancelación administrativa**; **pagos** con **reembolso** (doble confirmación + reintento MP); reembolsos; **configuración de precios** versionada + página de diagnóstico (presente/ausente sin exponer secretos); **auditoría** inmutable; export **CSV** de servicios y pagos (con guard admin). Todas las acciones quedan auditadas.
- ✅ Verificado: `tsc` limpio, `next build` OK (43 rutas).

- ✅ **Legales**: `/legal/terminos-clientes`, `/legal/terminos-proveedores`, `/legal/privacidad` con datos por variable, cláusula de intermediario, saldo directo al gruero, no-factura-fiscal, y aviso + candado de producción si faltan datos reales.
- ✅ **Tests Vitest**: 25 tests en verde (precios y redondeo de km, CUIT/DNI/patente/año, máquina de estados y actores, verificación de firma de webhook).
- ✅ **Seed demo** (`scripts/seed-demo.ts` + `npm run seed:demo`): usuarios cliente/gruero, grúa aprobada y disponible, vehículo y órdenes en varios estados. Solo fuera de producción.
- ✅ **Reseñas** al cierre (estrellas + comentario) con recálculo del rating del proveedor.
- ✅ **Docs completas**: README, ARQUITECTURA, DECISIONES, MODELO_DATOS, FLUJOS, ESTADOS_ORDEN, MERCADO_PAGO, SEGURIDAD, PRUEBAS, DEPLOY, GUIA_DEMO, ESTADO, PENDIENTES_REALES.
- ✅ Verificado: `tsc` limpio, **25 tests** en verde, `next build` OK (44 rutas), simulador y auth verificados en navegador.

## Pendiente menor (no bloquea la demo)
- 🟡 Notificaciones internas: tabla y disparadores base listos; falta el panel de campana en UI.
- 🟡 E2E Playwright: definidos en `docs/PRUEBAS.md`; se corren con Supabase+MP de prueba configurados.
- 🟡 Invitación de conductores por email (hoy el dueño los carga; el admin asocia la cuenta).

## Bloqueos reales (requieren al propietario)
Ver `docs/PENDIENTES_REALES.md`. Resumen: credenciales (Supabase, Mercado Pago, Geoapify),
`ADMIN_EMAIL`, WhatsApp, y razón social + CUIT reales para producción.
