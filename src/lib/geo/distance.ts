/**
 * Zona aproximada a partir de una dirección completa: descarta la calle y el
 * número (la parte exacta) y deja localidad/partido. Se usa para la oferta a los
 * grueros ANTES del pago: saben la zona para decidir, sin exponer el domicilio
 * exacto de una persona varada.
 */
export function zoneFromAddress(addr: string | null | undefined): string {
  if (!addr) return 'Zona del AMBA';
  const parts = addr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) return 'Zona del AMBA';
  // Descarta el primer segmento (calle + número); deja localidad/CP/partido.
  return parts.slice(1).join(', ');
}

/** Distancia en metros entre dos puntos (haversine). Para ordenar por cercanía. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
