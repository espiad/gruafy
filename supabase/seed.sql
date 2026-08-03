-- =============================================================================
-- gruafy — seed base (settings + centro de ayuda). Idempotente.
-- Los usuarios y órdenes de demostración se generan con scripts/seed-demo.ts
-- (requiere service role y solo debe correr fuera de producción).
-- =============================================================================

insert into platform_settings (id, version, values) values (
  1, 1,
  jsonb_build_object(
    'movida_base', 35000,
    'precio_km', 2500,
    'dolly', 120000,
    'comision_gruafy', 0.20,
    'iva_gruero', 0.21,
    'fee_mp', 0.0629,
    'iva_fee_mp', 0.21,
    'km_redondeo', 1,
    'max_pasajeros', 2,
    'oferta_proveedor_segundos', 60,
    'pago_cliente_segundos', 180,
    'radio_busqueda_km', 25,
    'extras_categorias', jsonb_build_array('peajes','espera','dollys_no_informados','ruedas_bloqueadas','condicion_distinta','acceso_especial'),
    'extra_tope_auto', 60000
  )
) on conflict (id) do nothing;

insert into support_articles (target_role, category, title, slug, content, published) values
('client','pedir','Cómo pedir una grúa','como-pedir-una-grua',
 'Elegí el vehículo, marcá dónde estás (punto A) y a dónde vas (punto B), revisá el presupuesto y confirmá. Primero una grúa acepta el viaje; recién ahí pagás por Mercado Pago el anticipo de gruafy (20%). El saldo lo arreglás directo con el gruero al finalizar.', true),
('client','pagar','Qué pagás ahora y qué pagás después','que-pagas-ahora-y-despues',
 'Ahora pagás solo la comisión de gruafy (20% del subtotal estimado) más el costo de procesamiento de Mercado Pago y su IVA. El resto del servicio (base + IVA del gruero + adicionales como peajes o espera) se lo pagás directamente al gruero cuando termina, en efectivo o transferencia.', true),
('client','tracking','Seguimiento en vivo','seguimiento-en-vivo',
 'Después de que se confirma el pago, ves el nombre de la grúa, su teléfono y su ubicación en el mapa en tiempo real. Vas a ver los estados: va hacia vos, llegó, vehículo cargado, en camino al destino y finalizado.', true),
('client','extras','Adicionales: peajes, espera y dollys','adicionales-peajes-espera-dollys',
 'El presupuesto base es fijo respecto de lo que declaraste. Pueden sumarse adicionales solo por situaciones avisadas de antemano: peajes, espera con cargo, dollys no informados, ruedas bloqueadas, condición distinta del vehículo o acceso especial. Cada adicional lleva motivo y, cuando corresponde, evidencia.', true),
('provider','aceptar','Cómo aceptar un pedido','como-aceptar-un-pedido',
 'Cuando estás disponible y con la documentación al día, recibís pedidos cercanos. Tenés 60 segundos para aceptar o rechazar. Ves marca/modelo del vehículo, condiciones, zona aproximada del origen, destino exacto, distancia y el monto estimado que vas a cobrar. Si aceptás, la orden queda reservada para vos hasta que el cliente pague.', true),
('provider','cobro','Cómo cobrás el servicio','como-cobras-el-servicio',
 'gruafy te cobra al cliente el anticipo del 20% para reservarte. El resto del servicio (tu base + IVA + adicionales) lo cobrás directamente al cliente al finalizar, por el medio que acuerden. Cargá los adicionales con motivo y evidencia antes de cerrar.', true),
('provider','documentos','Documentación necesaria','documentacion-necesaria',
 'Para operar necesitás: datos de la empresa (razón social, CUIT, seguro, habilitaciones), datos de la grúa (patente, VTV, seguro vigente, documentación técnica) y datos de cada conductor (nombre, DNI, licencia, LiNTI cuando corresponda). Un administrador revisa y aprueba todo manualmente.', true),
('all','general','Qué es gruafy','que-es-gruafy',
 'gruafy es una plataforma de asistencia vial on-demand: conecta a quien se quedó varado con grúas verificadas en AMBA. Como un Uber, pero con grúas: pedís, rastreás y resolvés, sin letra chica y con precio claro antes de aceptar.', true)
on conflict (slug) do nothing;
