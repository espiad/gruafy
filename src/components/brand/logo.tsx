import { cn } from '@/lib/utils';

/**
 * Isotipo gruafy: checkmark "✓" + chevron ">" (reproducción fiel del logo
 * aprobado del Manual_gruafy.pdf). Un solo color, hereda `currentColor`.
 */
export function GruafyMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 182 100"
      className={cn('h-8 w-auto', className)}
      role="img"
      aria-label="gruafy"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* checkmark */}
      <path
        d="M16 42 L54 92 L112 12"
        stroke="currentColor"
        strokeWidth="21"
        strokeLinejoin="miter"
        strokeLinecap="butt"
      />
      {/* chevron > */}
      <path
        d="M108 12 L170 50 L114 92"
        stroke="currentColor"
        strokeWidth="21"
        strokeLinejoin="miter"
        strokeLinecap="butt"
      />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  /** Color del isotipo y wordmark. Por defecto hereda el color del texto. */
  variant?: 'ink' | 'green' | 'orange' | 'cream' | 'current';
  showWordmark?: boolean;
}

const VARIANT_CLASS: Record<NonNullable<LogoProps['variant']>, string> = {
  ink: 'text-brand-ink',
  green: 'text-brand-green',
  orange: 'text-brand-orange',
  cream: 'text-brand-cream',
  current: '',
};

/** Logo completo: isotipo + wordmark "gruafy" (siempre en minúscula). */
export function Logo({ className, variant = 'green', showWordmark = true }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', VARIANT_CLASS[variant], className)}>
      <GruafyMark className="h-7 w-auto" />
      {showWordmark && (
        <span className="font-display text-2xl lowercase leading-none tracking-tight">gruafy</span>
      )}
    </span>
  );
}
