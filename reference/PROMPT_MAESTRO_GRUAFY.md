# PROMPT MAESTRO — DESARROLLO FINAL DE GRUAFY

## CÓMO USAR ESTE PROMPT

Trabajá dentro de una carpeta nueva o repositorio llamado `gruafy`. Colocá dentro del proyecto el archivo `Proyecto Final.zip` recibido con este prompt, preferentemente en `reference/Proyecto Final.zip`.

Antes de comenzar, completá las variables indicadas en la sección **Credenciales y datos que debe aportar el propietario**. No escribas secretos en archivos versionados ni en mensajes; cargalos en `.env.local`, Supabase y Vercel.

---

## ROL Y OBJETIVO

Actuá como un equipo senior completo de producto y desarrollo: arquitecto de software, desarrollador full-stack, diseñador UX/UI, especialista en Supabase, integrador de Mercado Pago, QA y responsable de despliegue.

Tu tarea es construir desde cero la entrega final funcional de **gruafy**, una plataforma web de asistencia vial on-demand que conecta conductores varados con proveedores de grúas en AMBA.

No es un ejercicio conceptual ni un prototipo visual. Debe quedar una web app completa, desplegada y demostrable, con flujos reales de usuario, proveedor y administrador, persistencia, permisos, mapas, pagos de Mercado Pago, tracking, documentación, pruebas y diseño alineado con el branding aprobado.

La fecha de entrega es inmediata. Priorizá completar un recorrido end-to-end sólido antes de agregar detalles secundarios. No sacrifiques seguridad de pagos, control de acceso ni consistencia de datos.

---

## FUENTES DE VERDAD Y PRIORIDAD

1. Las decisiones explícitas de este prompt.
2. La presentación de pretesis aprobada incluida en el ZIP.
3. `MVP GRUAFY.docx`, `User stories.docx`, `Roadmap_de_desarrollo_Gruafy.pdf`, `Stack_Tecnologico_Gruafy.pdf` y el mapa de flujo.
4. Los manuales y entregables de identidad visual y comunicación.
5. Los documentos legales, únicamente como borrador base cuando tengan campos sin completar.

Si dos documentos se contradicen, aplicá la decisión de mayor prioridad. No reabras decisiones ya cerradas. Registrá divergencias relevantes en `docs/DECISIONES.md`, pero continuá desarrollando.

### Decisiones cerradas que reemplazan contradicciones anteriores

- El producto final será **100% web responsive**, no React Native ni Expo.
- Habrá una sola aplicación Next.js con cuatro áreas: pública, cliente B2C, proveedor B2B y administración.
- El nombre de marca debe escribirse siempre **gruafy**, en minúsculas, salvo que una obligación gramatical o legal lo impida.
- Servicio activo: únicamente **acarreo con grúa**.
- Zona inicial: AMBA.
- La comisión de gruafy es **20% del subtotal estimado del servicio**, cobrada anticipadamente.
- Primero un proveedor acepta y queda reservado; después el cliente paga la comisión de gruafy.
- El cliente paga mediante Mercado Pago únicamente el anticipo de gruafy más los cargos/impuestos de procesamiento configurados.
- El saldo del servicio se arregla directamente con el gruero al finalizar, por efectivo, transferencia u otro medio aceptado entre las partes.
- Los proveedores y sus documentos son validados manualmente por un administrador.
- Debe haber validaciones automáticas mínimas de formato antes de enviar la documentación a revisión.
- La entrega final debe soportar Mercado Pago productivo. En desarrollo se deben validar los flujos con credenciales de prueba y cambiar a producción únicamente después de pasar las pruebas.
- No incluir funciones ajenas al alcance: combustible, cambio de rueda, desbloqueo o mecánica ligera.

---

## FORMA DE TRABAJO OBLIGATORIA

1. Descomprimí e inspeccioná todo `reference/Proyecto Final.zip`, incluyendo PDFs, DOCX, XLSX, PPTX e imágenes.
2. Extraé y reutilizá los activos gráficos aprobados. No reemplaces el logo por uno inventado.
3. Creá inmediatamente:
   - `docs/IMPLEMENTATION_PLAN.md`
   - `docs/DECISIONES.md`
   - `docs/ESTADO.md`
   - `docs/MODELO_DATOS.md`
   - `docs/FLUJOS.md`
4. No te detengas después de planificar. Empezá a implementar en la misma sesión.
5. Mantené `docs/ESTADO.md` actualizado con tareas completadas, pendientes y bloqueos reales.
6. Preguntá únicamente cuando falte una credencial, una verificación humana, un dato legal obligatorio o una acción que requiera entrar en una cuenta. Cuando ocurra, pedí una sola acción concreta y seguí con todo lo que no dependa de ella.
7. Ejecutá comandos, instalá dependencias, creá migraciones, corré pruebas, levantá el servidor y revisá visualmente la aplicación.
8. Hacé commits pequeños por hitos si el repositorio Git está disponible. No inventes, retrofeches ni manipules historial.
9. No dejes placeholders visibles, lorem ipsum, botones sin acción, rutas rotas, datos absurdos, comentarios de proceso ni referencias al prompt o a herramientas usadas para desarrollar.
10. No ocultes errores. Si algo externo bloquea una función, implementá toda la integración posible, documentá el paso exacto pendiente y mantené una alternativa segura para la demostración.

---

## STACK DEFINITIVO

Usá versiones estables y compatibles vigentes al momento de ejecutar:

- Next.js con App Router y TypeScript estricto.
- React.
- Tailwind CSS con tokens propios de gruafy.
- Componentes accesibles basados en Radix/shadcn únicamente como base; personalizarlos para que no parezcan una plantilla genérica.
- Supabase:
  - PostgreSQL.
  - Auth.
  - Storage privado.
  - Realtime.
  - Row Level Security.
- Vercel para deploy.
- Mercado Pago Checkout Pro mediante SDK oficial y Webhooks verificados.
- MapLibre GL JS para representación del mapa.
- Geoapify para geocodificación, autocompletado y rutas.
- Zod para validación compartida cliente/servidor.
- React Hook Form para formularios complejos.
- Vitest para pruebas unitarias y de integración.
- Playwright para recorridos end-to-end y capturas visuales.
- ESLint, Prettier y TypeScript strict.
- Sentry solo si se proporciona DSN; la aplicación no debe depender de Sentry para funcionar.

No uses MongoDB, Express separado, Redis, BullMQ, Cloudinary, Expo ni microservicios. Para esta entrega, una arquitectura monolítica modular en Next.js + Supabase reduce riesgos y mantiene todas las funciones necesarias.

### Estructura sugerida

```text
src/
  app/
    (public)/
    (auth)/
    cliente/
    proveedor/
    admin/
    api/
  components/
    brand/
    forms/
    maps/
    orders/
    provider/
    admin/
    ui/
  features/
    auth/
    pricing/
    orders/
    dispatch/
    payments/
    tracking/
    providers/
    reviews/
    notifications/
  lib/
    supabase/
    mercadopago/
    geoapify/
    auth/
    validation/
    security/
  server/
    actions/
    services/
    repositories/
    policies/
  types/
  styles/
supabase/
  migrations/
  seed.sql
  functions/
public/
  brand/
  images/
docs/
tests/
```

No sigas esta estructura mecánicamente si una alternativa mejora claramente la mantenibilidad, pero conservá separación por dominio.

---

## IDENTIDAD VISUAL Y EXPERIENCIA

### Marca

- Nombre: `gruafy`.
- Logo: usar el logo aprobado incluido en los archivos del ZIP.
- Tipografía principal/de identidad: Zen Dots.
- Tipografía secundaria/interfaz: Poppins.
- Paleta aprobada:
  - naranja: `#FF9E00`
  - verde: `#1C3C36`
  - negro verdoso: `#001910`
  - blanco cálido: `#F8F7F4`
- Usar los patrones escalonados, líneas horizontales, recorridos y módulos circulares definidos en el universo visual.
- El diseño debe sentirse urbano, ágil, preciso y digital, no corporativo ni genérico.
- Mobile-first, pero completamente usable en escritorio.
- Contraste y foco visibles. Cumplir WCAG AA en los flujos operativos.

### Tono

- Español rioplatense.
- Trato de “vos”.
- Frases directas y cortas.
- Cercano, claro y descontracturado, sin vulgaridad.
- No exagerar el humor cuando el usuario está varado o pagando.
- Conceptos de marca: “sin vueltas”, “sin letra chica”, “tracking en vivo”, “sabés quién viene”.
- Tagline aprobado: “Donde nadie quiere estar, ahí está gruafy.”

### Reglas de UX

- Nunca asumir que el usuario conoce grúas, dollys, caja trabada o documentación.
- Explicar cada término técnico con texto breve y ayuda contextual.
- Mostrar antes de confirmar:
  - qué se paga ahora;
  - qué se paga después al gruero;
  - qué incluye el presupuesto;
  - qué situaciones pueden generar extras;
  - cómo se calcula cada importe.
- Los flujos críticos deben requerir la menor cantidad razonable de pasos.
- Mantener un máximo aproximado de tres etapas de carga antes del presupuesto.
- Estados vacíos y errores deben indicar qué ocurrió y qué hacer.
- No usar alertas del navegador como interfaz principal.
- Todas las acciones destructivas requieren confirmación.

---

## ÁREAS Y RUTAS

### Público

- `/`
- `/como-funciona`
- `/simulador`
- `/ayuda`
- `/ayuda/[slug]`
- `/ingresar`
- `/registro`
- `/registro/proveedor`
- `/legal/terminos-clientes`
- `/legal/terminos-proveedores`
- `/legal/privacidad`

### Cliente B2C

- `/cliente`
- `/cliente/solicitar`
- `/cliente/solicitudes/[id]`
- `/cliente/historial`
- `/cliente/vehiculos`
- `/cliente/perfil`

### Proveedor B2B

- `/proveedor/onboarding`
- `/proveedor/estado-solicitud`
- `/proveedor`
- `/proveedor/servicios/[id]`
- `/proveedor/historial`
- `/proveedor/equipo`
- `/proveedor/perfil`

### Administrador

- `/admin`
- `/admin/proveedores`
- `/admin/proveedores/[id]`
- `/admin/servicios`
- `/admin/servicios/[id]`
- `/admin/clientes`
- `/admin/pagos`
- `/admin/reembolsos`
- `/admin/configuracion`
- `/admin/ayuda`
- `/admin/auditoria`

Agregar guards de servidor por sesión, rol y estado de aprobación. No confiar únicamente en ocultar enlaces del frontend.

---

## ROLES Y AUTENTICACIÓN

Roles:

- `client`
- `provider_owner`
- `provider_driver`
- `admin`

Usar Supabase Auth con cookies SSR mediante el paquete oficial actual. Implementar:

- registro por email y contraseña;
- inicio de sesión;
- recuperación de contraseña;
- confirmación de email cuando esté configurada;
- cierre de sesión;
- edición de perfil;
- opcionalmente Google OAuth si se aportan credenciales, sin bloquear la entrega si no están disponibles.

El alta de cliente debe ser rápida. El alta de proveedor puede crear la cuenta inmediatamente, pero no habilitar pedidos hasta la aprobación manual.

Crear un mecanismo seguro para convertir el email configurado en `ADMIN_EMAIL` en administrador. Nunca permitir que un usuario se asigne el rol admin desde el cliente.

Una cuenta de proveedor representa una grúa habilitada. Cada cuenta puede tener un propietario y hasta cinco conductores. Implementar alta, invitación o asociación de conductores. Si la entrega de correo impide una invitación real, permitir que el propietario cree el registro y que el administrador asocie posteriormente una cuenta autenticada, sin dejar la función simulada.

---

## MODELO DE DATOS

Crear migraciones SQL versionadas. Usar UUID, `created_at`, `updated_at`, soft delete cuando corresponda y restricciones reales.

Tablas mínimas:

1. `profiles`
   - `id` vinculado a `auth.users`
   - rol
   - nombre, apellido, teléfono, avatar
   - estado

2. `client_profiles`
   - DNI
   - datos de contacto
   - verificaciones mínimas

3. `vehicles`
   - cliente
   - marca, modelo, año
   - patente
   - tipo de caja
   - disponibilidad de llaves
   - cédula/documentación

4. `provider_accounts`
   - propietario
   - razón social
   - CUIT
   - contacto
   - estado: `draft`, `submitted`, `under_review`, `approved`, `rejected`, `suspended`
   - motivo de rechazo
   - disponibilidad operativa
   - última ubicación conocida

5. `provider_members`
   - proveedor
   - usuario
   - rol `owner` o `driver`
   - estado

6. `tow_trucks`
   - proveedor
   - patente
   - marca, modelo, año
   - capacidad y observaciones
   - estado

7. `provider_documents`
   - proveedor, grúa o conductor relacionado
   - tipo de documento
   - número opcional
   - ruta privada en Storage
   - vencimiento opcional
   - estado de revisión
   - observación admin

8. `service_orders`
   - cliente y vehículo
   - origen/destino: dirección, latitud y longitud
   - condiciones declaradas
   - distancia y duración estimadas
   - desglose económico congelado al confirmar
   - proveedor, conductor y grúa asignados
   - estado
   - deadlines de oferta y pago
   - timestamps de cada hito
   - motivos de cancelación

9. `provider_offers`
   - orden
   - proveedor
   - posición en la búsqueda
   - vencimiento
   - estado: `pending`, `accepted`, `rejected`, `expired`

10. `payments`
    - orden
    - tipo `gruafy_upfront`
    - preferencia e ID de pago de Mercado Pago
    - external reference
    - importe
    - estado
    - live mode
    - idempotency key
    - respuesta normalizada y payload técnico seguro

11. `refunds`
    - pago
    - importe
    - motivo
    - estado
    - ID externo

12. `tracking_locations`
    - orden
    - proveedor/conductor
    - latitud, longitud, precisión, heading, velocidad
    - timestamp

13. `service_extras`
    - orden
    - categoría
    - motivo
    - importe
    - evidencia
    - estado de validación

14. `reviews`
    - orden
    - autor y destinatario
    - puntuación 1–5
    - comentario

15. `notifications`
    - usuario
    - tipo
    - título, cuerpo, link
    - leída

16. `support_articles`
    - rol objetivo
    - categoría
    - título, slug, contenido
    - publicado

17. `platform_settings`
    - parámetros de precio y operación versionables

18. `order_events`
    - historial inmutable de cambios de estado y eventos relevantes

19. `admin_audit_logs`
    - administrador
    - acción
    - entidad
    - antes/después sanitizado

Crear índices por estado, fechas, usuario, proveedor y orden. Agregar constraints para importes no negativos, límites de puntuación y máximo de miembros por proveedor mediante lógica transaccional.

### Seguridad RLS

Aplicar RLS en todas las tablas accesibles por la aplicación:

- Clientes ven y modifican únicamente su perfil, vehículos y órdenes permitidas.
- Proveedores ven únicamente su cuenta, miembros, documentos y servicios ofrecidos/asignados.
- Antes del pago, el proveedor no recibe la ubicación exacta del punto A ni datos privados del cliente.
- Antes del pago, el cliente no recibe teléfono ni datos privados del proveedor.
- Administradores tienen acceso por rol verificado en servidor.
- Documentos se almacenan en buckets privados y se sirven mediante URLs firmadas de corta duración.
- La service role key jamás se expone al navegador.

---

## VALIDACIÓN DE PROVEEDORES

### Datos de empresa

- razón social;
- CUIT;
- email y teléfono;
- seguro y habilitaciones requeridas;
- RUTA cuando corresponda;
- archivos de respaldo.

### Datos de la grúa

- patente;
- marca, modelo y año;
- VTV;
- seguro vigente;
- documentación técnica solicitada.

### Conductores

- nombre y apellido;
- DNI;
- teléfono;
- licencia;
- LiNTI cuando corresponda;
- archivos de respaldo.

### Validaciones mínimas

- CUIT: 11 dígitos y checksum argentino válido.
- DNI: 7 u 8 dígitos.
- Patente: aceptar formatos argentinos viejos y Mercosur, normalizando mayúsculas y espacios.
- Año dentro de un rango razonable.
- Emails y teléfonos válidos.
- Documentos que requieren imagen/PDF: aceptar únicamente MIME permitidos, verificar tamaño y rechazar texto en lugar de archivo.
- Números de credenciales sin formato legal estable: validar presencia, longitud razonable y caracteres permitidos; no inventar algoritmos oficiales.
- Fechas de vencimiento no pueden estar vencidas al enviar, salvo que el tipo de documento no tenga vencimiento.

### Revisión admin

El administrador debe poder:

- abrir archivos mediante URL firmada;
- aprobar o rechazar cada documento;
- aprobar, rechazar o suspender la cuenta completa;
- escribir un motivo obligatorio al rechazar;
- ver historial de revisiones;
- devolver la solicitud para corrección.

El proveedor debe ver claramente:

- estado actual;
- documentos observados;
- motivo de rechazo;
- botón para reemplazarlos y reenviar.

Cuando la cuenta sea aprobada, mostrar onboarding operativo y permitir que se marque disponible.

---

## PRECIOS Y CONFIGURACIÓN ECONÓMICA

Crear valores iniciales configurables desde admin:

```text
movida_base = 35000 ARS
precio_km = 2500 ARS
dolly = 120000 ARS
comision_gruafy = 20%
iva_gruero = 21%
fee_mp_estimado = 6.29%
iva_fee_mp = 21%
max_pasajeros = 2
oferta_proveedor_segundos = 60
pago_cliente_segundos = 180
```

No dispersar constantes en el código. Guardarlas en `platform_settings`, crear defaults en migración y congelar un snapshot del desglose en cada orden.

### Fórmulas

```text
subtotal_proveedor_estimado = movida_base + (km_facturables * precio_km) + dollys
comision_gruafy = subtotal_proveedor_estimado * 0.20
fee_mp_estimado = comision_gruafy * tasa_mp
iva_fee_mp = fee_mp_estimado * tasa_iva_fee_mp
pago_inicial_cliente = comision_gruafy + fee_mp_estimado + iva_fee_mp
saldo_estimado_gruero = subtotal_proveedor_estimado + iva_gruero
```

Mostrar montos con formato ARS y aclarar que el fee de procesamiento es estimado/configurable. El importe enviado a Mercado Pago debe coincidir exactamente con el importe persistido para esa orden.

La distancia se calcula por ruta, no en línea recta. Definir y documentar cómo se redondean kilómetros.

### Extras

El presupuesto base queda fijo respecto de lo declarado por el usuario. Puede cambiar únicamente por categorías advertidas antes de confirmar, por ejemplo:

- peajes;
- espera;
- dollys no informados;
- ruedas faltantes o bloqueadas;
- condición distinta del vehículo;
- acceso especial.

Cada extra requiere categoría, explicación, importe y evidencia cuando corresponda. Validar automáticamente extras dentro de rangos configurados; marcar importes excepcionales para revisión admin. Mostrar el detalle al cliente y registrarlo en auditoría. El saldo final se paga directamente al gruero, fuera de Mercado Pago de gruafy.

---

## FLUJO B2C COMPLETO

### 1. Inicio y vehículo

- Registrarse o iniciar sesión.
- Seleccionar o crear vehículo.
- Marca, modelo, año, patente, caja manual/automática, caja trabada/no sabe, llaves disponibles, vía pública.
- Cantidad de ruedas faltantes/bloqueadas.
- Necesidad estimada de dollys con explicación visual.
- Adjuntar DNI, cédula u otros documentos definidos.
- Permitir “No lo sé” donde la pretesis lo contempla.

### 2. Ubicación y destino

- Solicitar geolocalización actual con explicación previa.
- Permitir ingreso manual si el permiso se rechaza.
- Autocompletar direcciones en AMBA.
- Mostrar punto A, punto B y ruta.
- Calcular distancia y duración.
- Validar que las coordenadas y direcciones sean consistentes.

### 3. Presupuesto

Mostrar:

- movida base;
- distancia;
- dollys;
- subtotal estimado del gruero;
- IVA estimado del gruero;
- comisión de gruafy que se paga ahora;
- costo de procesamiento;
- saldo estimado que se paga al gruero al finalizar;
- condiciones que pueden sumar extras;
- peajes no incluidos;
- máximo dos acompañantes;
- espera con cargo;
- términos y consentimiento.

No mostrar un único total ambiguo. Diferenciar visualmente “Pagás ahora” y “Pagás después”.

### 4. Búsqueda y asignación

- Al confirmar el presupuesto, crear orden `searching_provider`.
- Buscar proveedores aprobados, disponibles y con ubicación reciente.
- Ordenarlos por distancia al punto A.
- Generar una oferta secuencial de 60 segundos.
- La oferta previa debe expirar o rechazarse antes de pasar a la siguiente.
- Prevenir doble aceptación mediante transacción/RPC con bloqueo y constraint.
- Si no hay proveedores, informar claramente y no cobrar.
- El administrador puede asignar manualmente una orden si la búsqueda automática falla.

### 5. Reserva y pago

Cuando un proveedor acepta:

- cambiar a `awaiting_payment`;
- reservar proveedor, grúa y conductor;
- mostrar al cliente nombre comercial, calificación y ETA aproximada, sin revelar todavía datos privados;
- dar 180 segundos para pagar;
- crear preferencia de Mercado Pago por el pago inicial;
- si vence, liberar al proveedor y finalizar como `payment_expired` o reintentar búsqueda según regla documentada;
- el proveedor no debe iniciar recorrido hasta recibir confirmación de pago.

### 6. Seguimiento

Después de la confirmación real del webhook:

- revelar nombre, teléfono, empresa, patente y foto del proveedor;
- revelar al proveedor el punto A exacto y contacto del cliente;
- permitir llamada mediante `tel:` y contacto por WhatsApp mediante enlace;
- mostrar mapa, ubicación y ETA;
- estados visibles: “Va hacia vos”, “Llegó”, “Vehículo cargado”, “En camino al destino”, “Servicio finalizado”.

### 7. Cierre

- Mostrar saldo estimado/final a pagar al gruero.
- Mostrar extras cargados con motivos.
- Permitir descargar un comprobante/resumen de la operación; no denominarlo factura fiscal si no se emite legalmente.
- Solicitar reseña y comentario.
- Guardar servicio en historial.

---

## FLUJO B2B COMPLETO

### Onboarding

- Crear cuenta.
- Cargar empresa, grúa, documentos y conductores.
- Guardar borrador.
- Enviar a revisión.
- Ver estado y correcciones.
- Tras aprobación, completar onboarding de uso.

### Disponibilidad

- Botón claro “Disponible / No disponible”.
- Pedir permiso de ubicación.
- No permitir disponibilidad si la cuenta no está aprobada, la documentación esencial está vencida o no hay conductor/grúa válidos.
- Guardar última ubicación y hora.

### Ofertas

Mostrar durante 60 segundos:

- marca, modelo y año del vehículo;
- condiciones relevantes;
- zona aproximada del punto A, no dirección exacta;
- distancia desde el proveedor;
- destino exacto conforme al MVP aprobado;
- distancia total estimada;
- monto estimado a cobrar por el proveedor;
- botones aceptar y rechazar;
- cuenta regresiva real.

Al aceptar, usar una operación atómica. Si otro proveedor ya aceptó o la oferta venció, informar el resultado sin romper el flujo.

### Servicio

- Esperar el pago del cliente.
- Al pagarse, mostrar origen exacto y contacto.
- Iniciar recorrido.
- Enviar geolocalización mientras la pantalla esté activa.
- Mostrar aviso persistente: mantener gruafy abierto durante el servicio para compartir ubicación.
- Acciones de estado:
  - iniciar viaje al cliente;
  - confirmar llegada;
  - confirmar carga;
  - iniciar viaje al destino;
  - confirmar entrega;
  - agregar extras;
  - finalizar.
- Prevenir saltos inválidos de estado.
- Mostrar historial e importes.

---

## TRACKING Y MAPAS

- Usar MapLibre para el mapa.
- Usar Geoapify para autocompletado, geocodificación y routing.
- Aplicar bias/filtro hacia Argentina y AMBA cuando sea posible.
- Guardar lat/lng además de la dirección visible.
- Calcular rutas:
  - proveedor → punto A;
  - punto A → punto B.
- Actualizar ubicación del proveedor cada 5–10 segundos o al superar una distancia mínima razonable.
- No escribir una fila si la posición no cambió de manera útil.
- Publicar actualizaciones por Supabase Realtime en canales privados por orden.
- Guardar la última ubicación para recuperación tras reconexión.
- Mostrar precisión y hora de última actualización cuando la señal sea vieja.
- Si el navegador bloquea geolocalización o la pestaña se suspende, mostrar una advertencia y mecanismos de reintento.
- No prometer tracking en segundo plano cuando el navegador no lo garantiza.

---

## MERCADO PAGO PRODUCTIVO

Usar Checkout Pro y el SDK oficial actual.

### Reglas

- Nunca almacenar datos de tarjeta.
- Crear la preferencia únicamente desde servidor.
- Usar `external_reference` con el ID de orden.
- Usar idempotency key por operación.
- Configurar URLs de retorno aprobada, pendiente y fallida.
- Configurar `notification_url` HTTPS.
- Configurar expiración coherente con los 180 segundos cuando la API lo permita.
- El retorno del navegador no confirma el pago.
- La única confirmación válida es un webhook autenticado y una consulta server-to-server a Mercado Pago.
- Validar `x-signature`, `x-request-id`, ID de recurso, live mode, moneda, importe y external reference.
- Procesar webhooks de manera idempotente.
- Guardar únicamente payload técnico necesario y evitar datos sensibles.
- Responder rápido al webhook y procesar lo restante de forma segura.
- Implementar estados aprobado, pendiente, rechazado, cancelado y reembolsado.
- Implementar reembolso total desde admin para casos válidos, con doble confirmación y auditoría.
- Separar claramente credenciales test y producción.
- `PAYMENTS_MODE=production` debe usar únicamente credenciales productivas y una URL HTTPS válida.
- Agregar una página de diagnóstico admin que indique configuración presente/ausente sin revelar secretos.

### Casos de error obligatorios

- preferencia no creada;
- pago rechazado;
- pago pendiente;
- webhook duplicado;
- firma inválida;
- monto diferente;
- pago aprobado luego de vencer la reserva;
- proveedor cancela después del pago;
- reembolso fallido;
- usuario cierra la pestaña y vuelve.

El sistema debe conservar trazabilidad y no dejar una orden en un estado imposible.

---

## ADMINISTRACIÓN

Crear un panel claro, responsive y protegido.

### Dashboard

- servicios buscando proveedor;
- esperando pago;
- activos;
- finalizados;
- cancelados;
- proveedores pendientes;
- pagos aprobados/rechazados;
- incidencias.

### Proveedores

- filtros por estado;
- revisión de empresa, grúa, conductores y documentos;
- URLs firmadas;
- aprobación/rechazo con motivo;
- suspensión/reactivación;
- documentos próximos a vencer;
- historial de acciones.

### Servicios

- tabla y detalle;
- mapa;
- timeline completa;
- cliente, proveedor, vehículo, importes y extras;
- asignación manual;
- cancelación administrativa;
- exportación CSV.

### Pagos

- preferencia y pago de MP;
- estado;
- importe;
- orden asociada;
- eventos webhook;
- reembolso;
- exportación CSV.

### Configuración

- precios;
- comisión;
- IVA;
- fee estimado de MP;
- tiempos de oferta/pago;
- radio máximo de búsqueda;
- categorías y topes de extras;
- número de WhatsApp;
- textos de ayuda operativos.

Cada cambio económico debe quedar auditado y aplicarse solo a órdenes nuevas.

---

## LANDING, SIMULADOR Y AYUDA

### Landing

Construir una landing real basada en la identidad aprobada:

- hero con propuesta de valor;
- “Como Uber, pero con grúas” como explicación secundaria, no como marca;
- tres pasos: pedí, rastreá, resolvé;
- ventajas: rapidez, claridad, tracking y proveedores verificados;
- simulador;
- acceso cliente;
- CTA para sumarse como proveedor;
- preguntas frecuentes;
- contacto y legales;
- textos reales del manual de comunicación, adaptados a la UX.

No inventar testimonios presentados como reales. Si se necesitan para diseño, marcarlos como casos ilustrativos o no incluirlos.

### Simulador público

- origen y destino;
- condiciones básicas;
- ruta y distancia;
- desglose estimado;
- CTA a registrarse para pedir.
- No crear orden real hasta autenticación y confirmación.

### Centro de ayuda

- accesible sin login;
- búsqueda;
- filtros cliente/proveedor;
- artículos iniciales sobre pedir, pagar, tracking, extras, aceptar pedidos, documentos y cobro;
- administración simple de artículos;
- botón de WhatsApp configurado por variable.

---

## DOCUMENTOS LEGALES Y PRIVACIDAD

Tomar como base los documentos del ZIP, pero:

- eliminar placeholders visibles;
- usar las variables legales proporcionadas;
- distinguir a gruafy como intermediario tecnológico;
- explicar que el saldo final se paga directamente al proveedor;
- explicar geolocalización, documentos, almacenamiento y terceros;
- incluir aceptación explícita al registrarse y confirmar una orden;
- guardar versión y timestamp de aceptación;
- no presentar el comprobante como factura fiscal si el sistema no emite una factura válida.

No inventar una razón social ni CUIT. Si faltan, bloquear el deploy productivo con una verificación clara y usar valores de desarrollo únicamente fuera de producción.

---

## ESTADOS DE LA ORDEN

Implementar una máquina de estados centralizada y testeada. Estados sugeridos:

```text
draft
quoted
searching_provider
provider_reserved
awaiting_payment
payment_pending
paid
provider_en_route
provider_arrived
vehicle_loaded
in_transit
completion_pending
completed
no_provider
payment_expired
cancelled_by_client
cancelled_by_provider
cancelled_by_admin
refund_pending
refunded
disputed
```

Definir transiciones permitidas, actor autorizado, efectos secundarios y eventos generados. Nunca actualizar estados arbitrariamente desde el cliente.

Registrar cada transición en `order_events`.

---

## NOTIFICACIONES

Implementar como mínimo:

- notificaciones internas persistidas;
- actualizaciones realtime;
- toasts y sonido opcional para ofertas B2B;
- Browser Notification API opcional cuando el usuario da permiso;
- email mediante Supabase Auth para autenticación.

Eventos:

- solicitud enviada;
- nueva oferta al proveedor;
- proveedor asignado;
- pago pendiente/aprobado/rechazado;
- proveedor en camino;
- llegada;
- carga;
- finalización;
- documento aprobado/rechazado;
- reembolso.

No afirmar que existen push notifications en segundo plano si no se configuró Web Push real.

---

## SEGURIDAD

- TypeScript strict sin `any` injustificados.
- Validación Zod en todos los límites de confianza.
- RLS y comprobaciones de rol server-side.
- Rate limiting en endpoints sensibles, usando una solución compatible con Vercel o un límite simple persistente si no se proporciona servicio externo.
- Protección CSRF cuando corresponda.
- Cookies seguras, HttpOnly y SameSite.
- No loguear tokens, claves, documentos o payloads sensibles completos.
- Sanitizar nombres de archivo.
- MIME y tamaño máximo de uploads.
- URLs firmadas para documentos.
- Cabeceras de seguridad.
- No exponer stack traces en producción.
- Validar origen de webhooks.
- Idempotencia en pagos y aceptación de ofertas.
- Auditoría admin.
- `.env*` en `.gitignore`.
- `.env.example` únicamente con nombres y descripciones, nunca valores reales.

---

## PRUEBAS Y CALIDAD

### Unitarias

- cálculo de precios;
- redondeo de kilómetros;
- CUIT;
- patente y DNI;
- máquina de estados;
- permisos;
- validación de firmas/webhook con fixtures seguros;
- ordenamiento de proveedores por distancia.

### Integración

- creación de orden;
- oferta secuencial;
- aceptación atómica;
- expiración de pago;
- webhook idempotente;
- almacenamiento privado;
- revisión de proveedor;
- extras y cierre.

### E2E Playwright

Recorridos mínimos:

1. visitante simula y se registra;
2. cliente crea vehículo y pedido;
3. proveedor aprobado se pone disponible y acepta;
4. cliente completa el pago en entorno de prueba durante QA;
5. webhook habilita datos y tracking;
6. proveedor avanza estados y finaliza;
7. cliente deja reseña;
8. proveedor envía documentación y admin la rechaza/aprueba;
9. acceso no autorizado a rutas de otros roles falla;
10. responsive mobile y desktop.

Crear fixtures y usuarios de prueba solamente para entornos no productivos. Nunca publicar contraseñas demo en producción.

### Comandos obligatorios antes de cerrar

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Corregir errores y warnings relevantes. Revisar consola del navegador y red.

---

## DEMO Y PRODUCCIÓN

Implementar una variable:

```text
DEMO_MODE=false
```

- En desarrollo, puede existir un simulador de ubicación y fixtures para probar el flujo.
- En producción, `DEMO_MODE` debe ser `false`.
- Ningún botón o texto de demo debe aparecer cuando está desactivado.
- No usar mocks silenciosamente como reemplazo de integraciones productivas.

Configurar:

- proyecto Supabase;
- migraciones;
- buckets privados;
- variables de Vercel;
- dominio o subdominio disponible;
- webhook de Mercado Pago HTTPS;
- deploy de producción;
- seed controlado de artículos de ayuda y settings;
- creación segura del admin.

---

## CREDENCIALES Y DATOS QUE DEBE APORTAR EL PROPIETARIO

Crear `.env.example` con estas variables. El propietario completará los valores reales localmente y en Vercel.

```dotenv
# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=gruafy
NODE_ENV=development
DEMO_MODE=false

# Supabase público
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# Compatibilidad con proyectos que todavía usan anon key
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Supabase privado/CLI
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_REF=
SUPABASE_ACCESS_TOKEN=
SUPABASE_DB_PASSWORD=
DATABASE_URL=

# Mercado Pago
PAYMENTS_MODE=test
MERCADOPAGO_TEST_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADOPAGO_TEST_PUBLIC_KEY=
MERCADOPAGO_PRODUCTION_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADOPAGO_PRODUCTION_PUBLIC_KEY=
MERCADOPAGO_WEBHOOK_SECRET=

# Mapas
NEXT_PUBLIC_GEOAPIFY_API_KEY=

# Administrador
ADMIN_EMAIL=

# Contacto
NEXT_PUBLIC_WHATSAPP_NUMBER=
NEXT_PUBLIC_SUPPORT_EMAIL=

# Legales
NEXT_PUBLIC_LEGAL_NAME=
NEXT_PUBLIC_LEGAL_CUIT=
NEXT_PUBLIC_LEGAL_ADDRESS=
NEXT_PUBLIC_LEGAL_EMAIL=

# OAuth Google opcional
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Observabilidad opcional
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=

# Deploy opcional por CLI
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=
```

Si la nomenclatura oficial actual de Supabase o Mercado Pago cambió, adaptar el código a la documentación vigente manteniendo compatibilidad en `.env.example` y documentando la decisión.

Nunca imprimir valores secretos. Para verificar configuración, mostrar solamente presente/ausente y los últimos cuatro caracteres cuando sea seguro.

---

## DEFINITION OF DONE

La entrega no está terminada hasta que:

- la landing respeta el branding aprobado;
- las cuatro áreas están implementadas;
- un cliente puede registrarse, cotizar, pedir, pagar, seguir y cerrar;
- un proveedor puede registrarse, cargar documentos, ser aprobado, ponerse disponible, aceptar, trackear y finalizar;
- un administrador puede revisar proveedores, órdenes, pagos, extras y reembolsos;
- el flujo de pago tiene webhook verificado e idempotente;
- el tracking funciona con ubicaciones reales mientras la web está activa;
- los permisos impiden cruces de información;
- los documentos son privados;
- no hay placeholders visibles ni acciones falsas;
- el producto funciona en móvil y escritorio;
- todas las migraciones pueden ejecutarse desde cero;
- lint, types, tests y build pasan;
- existe un deploy navegable;
- existe documentación de instalación, operación y demo;
- el propietario puede explicar la arquitectura y cada flujo.

---

## DOCUMENTACIÓN FINAL A ENTREGAR

- `README.md`: instalación, variables, scripts y deploy.
- `docs/ARQUITECTURA.md`.
- `docs/DECISIONES.md`.
- `docs/MODELO_DATOS.md` con diagrama Mermaid.
- `docs/FLUJOS.md` con diagramas Mermaid B2C, B2B, admin y pagos.
- `docs/ESTADOS_ORDEN.md`.
- `docs/MERCADO_PAGO.md`.
- `docs/SUPABASE.md`.
- `docs/SEGURIDAD.md`.
- `docs/PRUEBAS.md`.
- `docs/DEPLOY.md`.
- `docs/GUIA_DEMO.md` con un recorrido de exposición de 5–10 minutos.
- `docs/PENDIENTES_REALES.md` solo si existen bloqueos externos inevitables; no usarlo para posponer trabajo realizable.

---

## ORDEN DE IMPLEMENTACIÓN PARA LA FECHA LÍMITE

### P0 — recorrido completo

1. Inicialización y branding.
2. Supabase, auth, roles y RLS.
3. Precios, vehículos y creación de orden.
4. Proveedor, disponibilidad y asignación.
5. Mercado Pago y webhooks.
6. Tracking y estados.
7. Cierre y reseña.

### P1 — control y entrega

8. Onboarding documental B2B.
9. Admin completo.
10. Extras, reembolsos e historial.
11. Landing, simulador, ayuda y legales.

### P2 — calidad

12. Tests, responsive, accesibilidad y errores.
13. Deploy, variables productivas y webhook.
14. Documentación y guía de demo.

No dediques tiempo a abstracciones prematuras, animaciones complejas o funciones fuera del alcance antes de completar P0 y P1.

---

## PRIMERA ACCIÓN

Comenzá ahora:

1. Confirmá la ubicación del ZIP y del repositorio.
2. Inspeccioná los documentos y activos.
3. Creá el plan y los archivos de decisión.
4. Inicializá el proyecto con el stack definido.
5. Implementá el recorrido P0 sin esperar una nueva instrucción.
6. Cuando necesites una acción humana, pedí exactamente el dato o clic necesario y continuá con el resto.
