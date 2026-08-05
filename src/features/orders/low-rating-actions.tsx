'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Loader2, X, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { rejectAndResearch } from './actions';
import { formatDateTime } from '@/lib/format';

interface Review {
  rating: number;
  comment: string | null;
  created_at: string;
}

/**
 * Acciones cuando la grúa asignada tiene reputación baja: ver sus reseñas en un
 * pop-up, o buscar otra (re-despacha excluyendo a este proveedor). El botón grande
 * de "continuar" es el de pago, que queda debajo.
 */
export function LowRatingActions({
  orderId,
  providerId,
  providerName,
}: {
  orderId: string;
  providerId: string;
  providerName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSearch, setConfirmSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openReviews() {
    setShowReviews(true);
    if (reviews) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('reviews')
        .select('rating, comment, created_at')
        .eq('target_provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(30);
      setReviews((data as Review[]) ?? []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  function searchAnother() {
    setError(null);
    start(async () => {
      const res = await rejectAndResearch(orderId);
      if (res.ok) router.refresh();
      else {
        setError(res.error ?? 'No pudimos buscar otra grúa');
        setConfirmSearch(false);
      }
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={openReviews}
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          <Star className="h-4 w-4" /> Ver reseñas
        </button>
        {!confirmSearch ? (
          <button
            onClick={() => setConfirmSearch(true)}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <Search className="h-4 w-4" /> Buscar otra grúa
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <button
              onClick={searchAnother}
              disabled={pending}
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-brand-cream disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Sí, buscar otra
            </button>
            <button onClick={() => setConfirmSearch(false)} disabled={pending} className="focus-ring rounded-lg px-2 py-2 text-sm text-muted-foreground hover:text-foreground">
              No
            </button>
          </span>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {showReviews && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setShowReviews(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Reseñas de {providerName}</h3>
              <button onClick={() => setShowReviews(false)} aria-label="Cerrar" className="focus-ring rounded-md p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            {loading ? (
              <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</p>
            ) : reviews && reviews.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {reviews.map((r, i) => (
                  <li key={i} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex" aria-label={`${r.rating} de 5`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={n <= r.rating ? 'h-3.5 w-3.5 fill-brand-orange text-brand-orange' : 'h-3.5 w-3.5 text-muted-foreground/30'} />
                        ))}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</span>
                    </div>
                    {r.comment && <p className="mt-1.5 text-sm">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-center text-sm text-muted-foreground">Todavía no tiene reseñas escritas.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
