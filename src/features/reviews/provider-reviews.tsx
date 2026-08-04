import { Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex" aria-label={`${rating} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={n <= rating ? 'h-3.5 w-3.5 fill-brand-orange text-brand-orange' : 'h-3.5 w-3.5 text-muted-foreground/40'}
        />
      ))}
    </span>
  );
}

/**
 * Lista de reseñas de un proveedor. Server component: lee directo (las reseñas son
 * de lectura pública). Se usa en el perfil del gruero, en el panel de admin y donde
 * haga falta dar transparencia sobre la reputación. Anónima: muestra estrellas,
 * comentario y fecha, sin exponer al autor.
 */
export async function ProviderReviews({
  providerId,
  limit = 20,
  title = 'Reseñas de clientes',
}: {
  providerId: string;
  limit?: number;
  title?: string;
}) {
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at')
    .eq('target_provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {reviews && reviews.length > 0 ? (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <Stars rating={r.rating} />
                <span className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</span>
              </div>
              {r.comment && <p className="mt-1.5 text-sm">{r.comment}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Todavía no hay reseñas.</p>
      )}
    </section>
  );
}
