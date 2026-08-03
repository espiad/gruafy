import { publicEnv } from '@/lib/env';

/** Encabezado legal con datos por variable y aviso si faltan datos productivos. */
export function LegalHeader({ title, updated }: { title: string; updated: string }) {
  const missing = !publicEnv.legal.cuit;
  return (
    <header className="not-prose mb-4">
      <h1 className="font-display text-2xl">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {publicEnv.legal.name}
        {publicEnv.legal.cuit && ` · CUIT ${publicEnv.legal.cuit}`} · {publicEnv.legal.address}
      </p>
      <p className="text-xs text-muted-foreground">Última actualización: {updated}</p>
      {missing && (
        <p className="mt-3 rounded-md bg-warning/15 p-3 text-xs text-warning-foreground">
          Documento en versión de desarrollo. La razón social y el CUIT reales se completan por
          variables de entorno antes del deploy productivo; hasta entonces, el build de producción
          queda bloqueado.
        </p>
      )}
    </header>
  );
}
