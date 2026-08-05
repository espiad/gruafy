/**
 * Candado de producción. Al iniciar el servidor, si el deploy es productivo
 * (`PAYMENTS_MODE=production`) y falta configuración crítica o datos legales
 * reales, se corta el arranque con un error claro en vez de servir algo inseguro.
 * En un entorno de prueba (`PAYMENTS_MODE=test`) no se dispara.
 */
export async function register() {
  const { productionReadiness, productionWarnings } = await import('@/lib/env');
  const problems = productionReadiness();
  if (problems.length > 0) {
    const detail = problems.map((p) => ` - ${p}`).join('\n');
    // eslint-disable-next-line no-console
    console.error(`\n[gruafy] Deploy productivo bloqueado. Faltan:\n${detail}\n`);
    throw new Error('gruafy: configuración de producción incompleta. Revisá los logs.');
  }
  const warnings = productionWarnings();
  if (warnings.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`\n[gruafy] Producción activa con advertencias (no bloqueantes):\n${warnings.map((w) => ` - ${w}`).join('\n')}\n`);
  }
}
