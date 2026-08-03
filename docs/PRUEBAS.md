# Pruebas — gruafy

## Comandos
```bash
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit (strict)
npm run test       # Vitest (unit + integración)
npm run build      # next build
npm run test:e2e   # Playwright (requiere Supabase + MP de prueba)
```

## Unitarias (Vitest) — `tests/unit/`
Estado actual: **25 tests en verde**.
- `pricing.test.ts`: desglose de precios y **redondeo de km** (comisión = 20% exacto del subtotal;
  importe del anticipo entero, compatible con MP).
- `argentina.test.ts`: **CUIT** (dígito verificador), **DNI**, **patente** (viejo/Mercosur/moto), año.
- `state-machine.test.ts`: transiciones válidas, **actor autorizado**, bloqueo de saltos inválidos,
  estados terminales, cancelación admin.
- `webhook.test.ts`: **verificación de firma** HMAC del webhook de Mercado Pago (válida, manipulada,
  ausente, id cambiado) con fixtures seguros.

## Integración (a completar con DB de prueba) — `tests/integration/`
Escenarios objetivo: creación de orden; oferta secuencial; **aceptación atómica** (doble aceptación
imposible); expiración de pago; **webhook idempotente**; almacenamiento privado; revisión de proveedor;
extras y cierre.

## E2E (Playwright) — `tests/e2e/`
Recorridos mínimos definidos:
1. visitante simula y se registra;
2. cliente crea vehículo y pedido;
3. proveedor aprobado se pone disponible y acepta;
4. cliente paga en entorno de prueba;
5. webhook habilita datos y tracking;
6. proveedor avanza estados y finaliza;
7. cliente deja reseña;
8. proveedor envía documentación y admin la aprueba/rechaza;
9. acceso no autorizado a rutas de otro rol falla;
10. responsive mobile y desktop.

Los fixtures y usuarios de prueba (`scripts/seed-demo.ts`) son **solo para entornos no productivos**.
Nunca publicar contraseñas demo en producción.

## Antes de cerrar
Correr lint, typecheck, test y build; revisar consola del navegador y red.
