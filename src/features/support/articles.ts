/**
 * Contenido base del centro de ayuda. Refleja `supabase/seed.sql` para que la
 * ayuda funcione sin base de datos (visitante no autenticado). Cuando Supabase
 * está configurado, `support_articles` es la fuente y admin puede editarla.
 */
export interface SupportArticle {
  slug: string;
  target_role: 'client' | 'provider' | 'all';
  category: string;
  title: string;
  content: string;
}

export const SUPPORT_ARTICLES: SupportArticle[] = [
  {
    slug: 'que-es-gruafy',
    target_role: 'all',
    category: 'General',
    title: 'Qué es gruafy',
    content:
      'gruafy es una plataforma de asistencia vial on-demand: conecta a quien se quedó varado con grúas verificadas en AMBA. Como un Uber, pero con grúas: pedís, rastreás y resolvés, sin letra chica y con precio claro antes de aceptar.',
  },
  {
    slug: 'como-pedir-una-grua',
    target_role: 'client',
    category: 'Pedir',
    title: 'Cómo pedir una grúa',
    content:
      'Elegí el vehículo, marcá dónde estás (punto A) y a dónde vas (punto B), revisá el presupuesto y confirmá. Primero una grúa acepta el viaje; recién ahí pagás por Mercado Pago el anticipo de gruafy (20%). El saldo lo arreglás directo con el gruero al finalizar.',
  },
  {
    slug: 'que-pagas-ahora-y-despues',
    target_role: 'client',
    category: 'Pagar',
    title: 'Qué pagás ahora y qué pagás después',
    content:
      'Ahora pagás solo la comisión de gruafy (20% del subtotal estimado) más el costo de procesamiento de Mercado Pago y su IVA. El resto del servicio (base + IVA del gruero + adicionales como peajes o espera) se lo pagás directamente al gruero cuando termina, en efectivo o transferencia.',
  },
  {
    slug: 'seguimiento-en-vivo',
    target_role: 'client',
    category: 'Tracking',
    title: 'Seguimiento en vivo',
    content:
      'Después de que se confirma el pago, ves el nombre de la grúa, su teléfono y su ubicación en el mapa en tiempo real. Vas a ver los estados: va hacia vos, llegó, vehículo cargado, en camino al destino y finalizado.',
  },
  {
    slug: 'adicionales-peajes-espera-dollys',
    target_role: 'client',
    category: 'Adicionales',
    title: 'Adicionales: peajes, espera y dollys',
    content:
      'El presupuesto base es fijo respecto de lo que declaraste. Pueden sumarse adicionales solo por situaciones avisadas de antemano: peajes, espera con cargo, dollys no informados, ruedas bloqueadas, condición distinta del vehículo o acceso especial. Cada adicional lleva motivo y, cuando corresponde, evidencia.',
  },
  {
    slug: 'como-aceptar-un-pedido',
    target_role: 'provider',
    category: 'Aceptar',
    title: 'Cómo aceptar un pedido',
    content:
      'Cuando estás disponible y con la documentación al día, recibís pedidos cercanos. Tenés 60 segundos para aceptar o rechazar. Ves marca/modelo del vehículo, condiciones, zona aproximada del origen, destino exacto, distancia y el monto estimado que vas a cobrar. Si aceptás, la orden queda reservada para vos hasta que el cliente pague.',
  },
  {
    slug: 'como-cobras-el-servicio',
    target_role: 'provider',
    category: 'Cobro',
    title: 'Cómo cobrás el servicio',
    content:
      'gruafy te cobra al cliente el anticipo del 20% para reservarte. El resto del servicio (tu base + IVA + adicionales) lo cobrás directamente al cliente al finalizar, por el medio que acuerden. Cargá los adicionales con motivo y evidencia antes de cerrar.',
  },
  {
    slug: 'documentacion-necesaria',
    target_role: 'provider',
    category: 'Documentos',
    title: 'Documentación necesaria',
    content:
      'Para operar necesitás: datos de la empresa (razón social, CUIT, seguro, habilitaciones), datos de la grúa (patente, VTV, seguro vigente, documentación técnica) y datos de cada conductor (nombre, DNI, licencia, LiNTI cuando corresponda). Un administrador revisa y aprueba todo manualmente.',
  },
];

export function findArticle(slug: string) {
  return SUPPORT_ARTICLES.find((a) => a.slug === slug);
}
