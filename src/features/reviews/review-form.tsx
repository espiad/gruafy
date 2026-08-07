'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { submitReview } from './actions';
import { cn } from '@/lib/utils';

export function ReviewForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (rating < 1) return setError('Elegí una puntuación.');
    start(async () => {
      const res = await submitReview({ orderId, rating, comment });
      if (res.ok) {
        setDone(true);
        // Cerramos el ciclo: agradecemos y lo devolvemos al inicio, sin dejarlo
        // varado en una pantalla de un servicio que ya terminó.
        setTimeout(() => {
          router.push('/cliente');
          router.refresh();
        }, 1600);
      } else setError(res.error ?? 'Error');
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-success/40 bg-success/5 p-5 text-center">
        <CheckCircle2 className="mx-auto h-6 w-6 text-success" />
        <p className="mt-2 font-medium">¡Gracias por tu reseña!</p>
        <p className="mt-1 text-sm text-muted-foreground">Te llevamos al inicio…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">¿Cómo estuvo el servicio?</h2>
      <div className="mt-3 flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} estrellas`}
            onMouseEnter={() => setHover(n)}
            onClick={() => setRating(n)}
            className="focus-ring rounded p-1"
          >
            <Star className={cn('h-7 w-7', (hover || rating) >= n ? 'fill-brand-orange text-brand-orange' : 'text-muted-foreground')} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Contanos cómo fue (opcional)"
        rows={3}
        className="focus-ring mt-3 w-full rounded-md border border-input bg-background p-3 text-sm"
      />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <Button onClick={submit} disabled={pending} className="mt-3">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Enviar reseña
      </Button>
    </div>
  );
}
