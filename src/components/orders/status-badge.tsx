import { cn } from '@/lib/utils';
import { STATE_LABELS, type OrderState } from '@/features/orders/state-machine';

const TONE: Partial<Record<OrderState, string>> = {
  searching_provider: 'bg-warning/15 text-warning-foreground border-warning/40',
  provider_reserved: 'bg-brand-orange/15 text-brand-green border-brand-orange/40',
  awaiting_payment: 'bg-brand-orange/20 text-brand-green border-brand-orange',
  payment_pending: 'bg-warning/15 text-warning-foreground border-warning/40',
  paid: 'bg-success/15 text-success border-success/40',
  provider_en_route: 'bg-success/15 text-success border-success/40',
  provider_arrived: 'bg-success/15 text-success border-success/40',
  vehicle_loaded: 'bg-success/15 text-success border-success/40',
  in_transit: 'bg-success/15 text-success border-success/40',
  completed: 'bg-brand-green/10 text-brand-green border-brand-green/30',
  no_provider: 'bg-muted text-muted-foreground border-border',
  payment_expired: 'bg-destructive/10 text-destructive border-destructive/30',
  cancelled_by_client: 'bg-destructive/10 text-destructive border-destructive/30',
  cancelled_by_provider: 'bg-destructive/10 text-destructive border-destructive/30',
  cancelled_by_admin: 'bg-destructive/10 text-destructive border-destructive/30',
  refunded: 'bg-muted text-muted-foreground border-border',
  disputed: 'bg-destructive/10 text-destructive border-destructive/30',
};

export function StatusBadge({ state, className }: { state: OrderState; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        TONE[state] ?? 'bg-muted text-muted-foreground border-border',
        className,
      )}
    >
      {STATE_LABELS[state]}
    </span>
  );
}
