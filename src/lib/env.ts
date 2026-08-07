/**
 * Acceso centralizado y tipado a variables de entorno.
 * No arroja al importar: expone helpers para validar según el contexto (dev/prod).
 */

function get(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const isProduction = process.env.NODE_ENV === 'production';

/** DEMO_MODE habilita simulador de ubicación y atajos de QA. En prod debe ser false. */
export const isDemoMode = get('DEMO_MODE') === 'true' && !isProduction;

/**
 * Modo de pagos activo, controlado por `PAYMENTS_MODE` (test por defecto).
 * Se controla por variable —y no por NODE_ENV— para poder desplegar un entorno
 * de prueba online con credenciales de test. `productionReadiness()` exige las
 * credenciales productivas cuando el deploy sí es de producción.
 */
export function paymentsMode(): 'test' | 'production' {
  return get('PAYMENTS_MODE') === 'production' ? 'production' : 'test';
}

/** Normaliza cadena vacía → undefined. Recibe el VALOR (no el nombre). */
const clean = (v: string | undefined): string | undefined => (v && v.length > 0 ? v : undefined);

/**
 * IMPORTANTE: las variables `NEXT_PUBLIC_*` deben leerse con nombre LITERAL
 * (`process.env.NEXT_PUBLIC_X`), no con clave dinámica, para que Next.js las
 * incruste en el bundle del navegador. Un acceso dinámico queda `undefined` en
 * el cliente aunque exista en el servidor.
 */
export const publicEnv = {
  appUrl: clean(process.env.NEXT_PUBLIC_APP_URL) ?? 'http://localhost:3000',
  appName: clean(process.env.NEXT_PUBLIC_APP_NAME) ?? 'gruafy',
  supabaseUrl: clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey:
    clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  geoapifyKey: clean(process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY),
  whatsapp: clean(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER),
  // Vacío = no configurado todavía; la UI lo omite en vez de mostrar un placeholder.
  supportEmail: clean(process.env.NEXT_PUBLIC_SUPPORT_EMAIL) ?? '',
  legal: {
    name: clean(process.env.NEXT_PUBLIC_LEGAL_NAME) ?? 'gruafy',
    cuit: clean(process.env.NEXT_PUBLIC_LEGAL_CUIT) ?? '',
    address: clean(process.env.NEXT_PUBLIC_LEGAL_ADDRESS) ?? 'CABA, Argentina',
    email: clean(process.env.NEXT_PUBLIC_LEGAL_EMAIL) ?? '',
  },
} as const;

/** ¿Están presentes las claves de Supabase para el cliente? */
export const hasSupabaseConfig = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseKey);

// El "pago simulado" ya NO se controla por variable de entorno: lo enciende y
// apaga el admin desde Configuración (`permitir_pago_simulado`), para poder
// cambiarlo en el momento sin un redeploy. Ver `pagoSimuladoHabilitado()`.

/**
 * Candado de producción: si falta configuración crítica o datos legales reales,
 * el arranque en producción debe fallar de forma explícita (no silenciosa).
 * Devuelve la lista de problemas; vacía significa OK.
 */
export function productionReadiness(): string[] {
  const problems: string[] = [];
  // Solo exigimos todo cuando el deploy es realmente productivo (pagos en vivo).
  // Un entorno de prueba online (PAYMENTS_MODE=test) puede correr sin datos legales.
  if (paymentsMode() !== 'production') return problems;

  if (isDemoMode) problems.push('DEMO_MODE no puede estar activo en producción.');
  if (!publicEnv.supabaseUrl) problems.push('Falta NEXT_PUBLIC_SUPABASE_URL.');
  if (!publicEnv.supabaseKey) problems.push('Falta la clave pública de Supabase.');
  if (!get('SUPABASE_SERVICE_ROLE_KEY')) problems.push('Falta SUPABASE_SERVICE_ROLE_KEY.');
  if (!get('MERCADOPAGO_PRODUCTION_ACCESS_TOKEN'))
    problems.push('Falta MERCADOPAGO_PRODUCTION_ACCESS_TOKEN.');
  if (!get('NEXT_PUBLIC_MERCADOPAGO_PRODUCTION_PUBLIC_KEY'))
    problems.push('Falta NEXT_PUBLIC_MERCADOPAGO_PRODUCTION_PUBLIC_KEY.');
  if (!get('MERCADOPAGO_WEBHOOK_SECRET')) problems.push('Falta MERCADOPAGO_WEBHOOK_SECRET.');
  if (!publicEnv.appUrl.startsWith('https://'))
    problems.push('NEXT_PUBLIC_APP_URL debe ser HTTPS en producción.');
  if (!get('ADMIN_EMAIL')) problems.push('Falta ADMIN_EMAIL.');
  if (!publicEnv.geoapifyKey) problems.push('Falta NEXT_PUBLIC_GEOAPIFY_API_KEY.');
  return problems;
}

/**
 * Advertencias de producción (no bloquean el arranque, pero conviene resolver):
 * los datos fiscales/legales. Sin CUIT/razón social se puede operar el anticipo,
 * pero la facturación real los necesita. Se muestran vacíos, nunca inventados.
 */
export function productionWarnings(): string[] {
  if (paymentsMode() !== 'production') return [];
  const warnings: string[] = [];
  if (!get('NEXT_PUBLIC_LEGAL_NAME')) warnings.push('Sin razón social real (NEXT_PUBLIC_LEGAL_NAME).');
  if (!get('NEXT_PUBLIC_LEGAL_CUIT')) warnings.push('Sin CUIT real (NEXT_PUBLIC_LEGAL_CUIT).');
  return warnings;
}

/** Configuración de servidor (nunca importar desde componentes cliente). */
export const serverEnv = {
  supabaseUrl: () => publicEnv.supabaseUrl,
  serviceRoleKey: () => get('SUPABASE_SERVICE_ROLE_KEY'),
  adminEmail: () => get('ADMIN_EMAIL'),
  mp: () => {
    const mode = paymentsMode();
    return {
      mode,
      accessToken:
        mode === 'production'
          ? get('MERCADOPAGO_PRODUCTION_ACCESS_TOKEN')
          : get('MERCADOPAGO_TEST_ACCESS_TOKEN'),
      publicKey:
        mode === 'production'
          ? get('NEXT_PUBLIC_MERCADOPAGO_PRODUCTION_PUBLIC_KEY')
          : get('NEXT_PUBLIC_MERCADOPAGO_TEST_PUBLIC_KEY'),
      webhookSecret: get('MERCADOPAGO_WEBHOOK_SECRET'),
    };
  },
};
