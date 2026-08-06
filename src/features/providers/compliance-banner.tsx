import Link from 'next/link';
import { AlertTriangle, CalendarClock, IdCard, Camera, FileText, ArrowRight } from 'lucide-react';
import type { Compliance } from './drivers';

const ICONO: Record<string, typeof IdCard> = {
  DNI: IdCard,
  licencia: FileText,
  foto: Camera,
  teléfono: IdCard,
  nombre: IdCard,
};

/**
 * Aviso de documentación pendiente. NO bloquea el servicio: el gruero puede operar
 * igual, pero se le recuerda de forma bien visible qué le falta, cuántos días le
 * quedan y qué pasa si no regulariza. Se muestra en todas sus pantallas hasta que
 * completa todo.
 */
export function ComplianceBanner({ compliance, compact = false }: { compliance: Compliance; compact?: boolean }) {
  if (compliance.alDia) return null;

  const { incompletos, diasRestantes, vencido } = compliance;
  const faltantes = Array.from(new Set(incompletos.flatMap((d) => d.missing)));

  // Versión chica para las pantallas internas (servicio en curso, conductores…).
  if (compact) {
    return (
      <Link
        href="/proveedor/equipo"
        className={`focus-ring flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-xs font-medium ${
          vencido ? 'border-destructive bg-destructive/10 text-destructive' : 'border-warning bg-warning/10 text-warning-foreground'
        }`}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          {vencido
            ? 'Documentación vencida: tu cuenta puede ser bloqueada.'
            : `Te falta documentación${diasRestantes !== null ? ` · ${diasRestantes} día${diasRestantes === 1 ? '' : 's'} para regularizar` : ''}`}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0" />
      </Link>
    );
  }

  return (
    <div
      className={`rounded-2xl border-2 p-5 ${
        vencido ? 'border-destructive bg-destructive/5' : 'border-warning bg-warning/10'
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={`mt-0.5 h-6 w-6 shrink-0 ${vencido ? 'text-destructive' : 'text-warning-foreground'}`} />
        <div className="min-w-0 flex-1">
          <h2 className={`font-display text-lg ${vencido ? 'text-destructive' : ''}`}>
            {vencido ? 'Tu documentación está vencida' : 'Te falta documentación obligatoria'}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {vencido ? (
              <>
                Se cumplió el plazo para completar los datos de tus conductores.{' '}
                <strong className="text-destructive">Un administrador puede bloquear tu cuenta en cualquier momento.</strong>{' '}
                Regularizá ahora para seguir trabajando.
              </>
            ) : (
              <>
                <strong>Podés seguir tomando auxilios con normalidad</strong>, pero en gruafy pedimos la
                documentación completa de cada conductor por seguridad de los clientes.
              </>
            )}
          </p>

          {/* Cuenta regresiva */}
          {!vencido && diasRestantes !== null && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-warning/20 px-3 py-1.5 text-sm font-semibold">
              <CalendarClock className="h-4 w-4" />
              {diasRestantes <= 0
                ? 'Último día para regularizar'
                : `Te ${diasRestantes === 1 ? 'queda' : 'quedan'} ${diasRestantes} día${diasRestantes === 1 ? '' : 's'} para completarla`}
            </p>
          )}

          {/* Qué falta, por conductor */}
          <div className="mt-3 space-y-1.5">
            {incompletos.map((d) => (
              <p key={d.id} className="text-sm">
                <strong>{d.full_name || 'Conductor sin nombre'}</strong>{' '}
                <span className="text-muted-foreground">
                  — falta {d.missing.join(', ')}
                </span>
              </p>
            ))}
          </div>

          {/* Qué se pide, explicado */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {faltantes.map((f) => {
              const Icon = ICONO[f] ?? IdCard;
              return (
                <span key={f} className="inline-flex items-center gap-1">
                  <Icon className="h-3.5 w-3.5" /> {f}
                </span>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Si no llegás a completarla en el plazo, tu cuenta queda sujeta a revisión y un administrador
            puede suspenderla hasta que regularices.
          </p>

          <Link
            href="/proveedor/equipo"
            className={`focus-ring mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${
              vencido ? 'bg-destructive text-white' : 'bg-brand-green text-brand-cream'
            }`}
          >
            Completar ahora <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
