/** Formateo de moneda argentina (ARS) consistente en cliente y servidor. */
const arsFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Devuelve un importe (en ARS enteros) como "$ 12.345". */
export function formatARS(amount: number): string {
  return arsFormatter.format(Math.round(amount));
}

/** Formatea distancia en metros a "12,3 km" o "850 m". */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`;
}

/** Formatea una duración en segundos a "1 h 05 min" / "12 min". */
export function formatDuration(seconds: number): string {
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h} h ${m.toString().padStart(2, '0')} min`;
}

/** Fecha/hora corta en formato rioplatense. */
export function formatDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
