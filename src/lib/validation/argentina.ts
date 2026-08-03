/**
 * Validaciones de formato de documentos argentinos.
 * No inventamos algoritmos oficiales inexistentes: para CUIT usamos el dígito
 * verificador real; para DNI/patente validamos formato; para credenciales sin
 * algoritmo estable (VTV, LiNTI, etc.) validamos presencia y longitud razonable.
 */

/** Valida CUIT/CUIL de 11 dígitos con dígito verificador (módulo 11). */
export function isValidCuit(input: string): boolean {
  const clean = input.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digits = clean.split('').map(Number);
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i]!, 0);
  const mod = 11 - (sum % 11);
  const check = mod === 11 ? 0 : mod === 10 ? 9 : mod;
  return check === digits[10];
}

/** Formatea un CUIT a XX-XXXXXXXX-X si tiene 11 dígitos. */
export function formatCuit(input: string): string {
  const c = input.replace(/\D/g, '');
  if (c.length !== 11) return input;
  return `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}`;
}

/**
 * Formatea mientras se escribe: agrega los guiones automáticamente
 * (XX-XXXXXXXX-X) sin importar si el usuario los puso o no.
 */
export function formatCuitInput(input: string): string {
  const c = input.replace(/\D/g, '').slice(0, 11);
  if (c.length <= 2) return c;
  if (c.length <= 10) return `${c.slice(0, 2)}-${c.slice(2)}`;
  return `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}`;
}

/** DNI argentino: 7 u 8 dígitos. */
export function isValidDni(input: string): boolean {
  const clean = input.replace(/\D/g, '');
  return clean.length >= 7 && clean.length <= 8;
}

const PATENTE_VIEJA = /^[A-Z]{3}\d{3}$/; // AAA123
const PATENTE_MERCOSUR = /^[A-Z]{2}\d{3}[A-Z]{2}$/; // AB123CD
const PATENTE_MOTO_MERCOSUR = /^[A-Z]\d{3}[A-Z]{3}$/; // A123BCD

/** Normaliza una patente: mayúsculas, sin espacios ni guiones. */
export function normalizePatente(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

/** Acepta formatos argentinos viejos y Mercosur (auto y moto). */
export function isValidPatente(input: string): boolean {
  const p = normalizePatente(input);
  return PATENTE_VIEJA.test(p) || PATENTE_MERCOSUR.test(p) || PATENTE_MOTO_MERCOSUR.test(p);
}

/** Año dentro de un rango razonable para un vehículo o grúa. */
export function isValidVehicleYear(year: number, currentYear = new Date().getFullYear()): boolean {
  return Number.isInteger(year) && year >= 1950 && year <= currentYear + 1;
}

/** Teléfono AR: 8 a 15 dígitos, admite +54 y separadores. */
export function isValidPhone(input: string): boolean {
  const clean = input.replace(/[\s()+-]/g, '');
  return /^\d{8,15}$/.test(clean);
}

/** Número de credencial genérico sin algoritmo oficial: presencia y forma. */
export function isPlausibleCredential(input: string, min = 4, max = 30): boolean {
  const v = input.trim();
  return v.length >= min && v.length <= max && /^[A-Za-z0-9./-]+$/.test(v);
}

/** ¿La fecha de vencimiento sigue vigente (no vencida al momento de enviar)? */
export function isNotExpired(dateISO: string, now = new Date()): boolean {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() >= now.setHours(0, 0, 0, 0);
}
