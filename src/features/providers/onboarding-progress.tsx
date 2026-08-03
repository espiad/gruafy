import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['Empresa', 'Grúa', 'Documentos', 'Enviar'] as const;

/** Barra de progreso del alta de proveedor (1..4). Pasos previos quedan tildados. */
export function OnboardingProgress({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="flex items-center gap-1">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  done && 'bg-brand-green text-brand-cream',
                  active && 'bg-brand-orange text-brand-ink',
                  !done && !active && 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : n}
              </span>
              <span className={cn('text-[10px] sm:text-xs', active ? 'font-medium text-brand-green' : 'text-muted-foreground')}>
                {label}
              </span>
            </div>
            {n < STEPS.length && (
              <span className={cn('mb-4 h-0.5 flex-1 rounded', done ? 'bg-brand-green' : 'bg-border')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
