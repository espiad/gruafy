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
  {
    slug: 'foto-de-la-situacion',
    target_role: 'client',
    category: 'Pedir',
    title: 'La foto de la situación',
    content:
      'Al pedir, te pedimos una foto del vehículo tomada en el momento (no de la galería). Sirve para que la grúa vea a qué va antes de aceptar (por ejemplo, si el auto está en una zanja) y para evitar sorpresas. Se comprime en tu teléfono para que suba rápido.',
  },
  {
    slug: 'cuantas-personas-viajan',
    target_role: 'client',
    category: 'Durante el servicio',
    title: '¿Cuántas personas pueden viajar?',
    content:
      'Con la grúa viajan como máximo 2 personas junto al vehículo. Si son más, coordiná otro transporte antes de que llegue la grúa. El gruero no puede dejar a nadie en la vía pública. Ante una emergencia, usá el botón para llamar al 911.',
  },
  {
    slug: 'cambiar-de-grua-reputacion',
    target_role: 'client',
    category: 'Durante el servicio',
    title: 'Cambiar de grúa antes de pagar',
    content:
      'Si la grúa que aceptó tiene una reputación baja (2★ o menos), antes de pagar podés ver sus reseñas y elegir "Buscar otra grúa". Volvemos a buscar excluyendo a ese proveedor; si no hay ninguna otra disponible, se te vuelve a ofrecer. También podés continuar con esa grúa si querés.',
  },
  {
    slug: 'reintegro-con-el-seguro',
    target_role: 'client',
    category: 'Después del servicio',
    title: 'Recuperar el costo con tu seguro',
    content:
      'Muchas pólizas reintegran el acarreo. Al finalizar, pedile la factura al gruero, copiá el resumen del servicio que te damos (fecha, recorrido, vehículo e importes) y presentalos a tu seguro pidiendo el reintegro por asistencia/acarreo. Te dejamos todo listo para copiar.',
  },
  {
    slug: 'recuperar-contrasena',
    target_role: 'all',
    category: 'Cuenta',
    title: 'Recuperar la contraseña',
    content:
      'En la pantalla de ingreso tocá "¿La olvidaste?", poné tu email y te llega un enlace para crear una nueva. También podés entrar con Google. Si te faltan datos (nombre, DNI), te vamos a pedir completarlos una sola vez.',
  },
  {
    slug: 'instalar-gruafy-en-el-inicio',
    target_role: 'all',
    category: 'App',
    title: 'Instalar gruafy en tu teléfono',
    content:
      'gruafy funciona como app: en Android tocá el menú del navegador y "Agregar a pantalla principal"; en iPhone tocá Compartir y "Agregar a inicio". Activá también las notificaciones para enterarte al instante cuando una grúa acepta o entra un pedido.',
  },
  {
    slug: 'adicionales-catalogo-limites',
    target_role: 'provider',
    category: 'Cobro',
    title: 'Adicionales: catálogo y límites',
    content:
      'Los adicionales se cargan desde un catálogo definido por gruafy. Según la categoría, el monto es fijo, dentro de un rango permitido o libre, y hay un tope de cantidad por servicio (por ejemplo, hasta 5 peajes). No se pueden cobrar montos fuera de esos límites. Cobrar de más o adicionales no prestados es una falta grave.',
  },
  {
    slug: 'foto-del-conductor',
    target_role: 'provider',
    category: 'Documentos',
    title: 'Foto del conductor',
    content:
      'Cada conductor debe cargar una foto identificatoria (además de la licencia): la cara, bien iluminada. Se le muestra al cliente para su seguridad y un administrador la valida comparándola con la licencia. Sin la foto, el conductor no queda habilitado.',
  },
  {
    slug: 'disponibilidad-y-pedidos',
    target_role: 'provider',
    category: 'Aceptar',
    title: 'Disponibilidad y notificaciones',
    content:
      'Con el interruptor "Disponible" entrás a la red y empezás a recibir pedidos cercanos. Activá las notificaciones y el sonido para que no se te escape ninguno. Mientras tengas un servicio en curso, no recibís pedidos nuevos hasta cerrarlo.',
  },
];

export function findArticle(slug: string) {
  return SUPPORT_ARTICLES.find((a) => a.slug === slug);
}
