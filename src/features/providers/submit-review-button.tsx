'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { submitProviderForReview } from './actions';

export function SubmitReviewButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    start(async () => {
      const res = await submitProviderForReview();
      if (res.ok) router.refresh();
      else setError(res.error ?? 'No pudimos enviar');
    });
  }

  return (
    <div className="space-y-2">
      <Button onClick={submit} disabled={pending || disabled} size="lg" className="w-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Enviar a revisión
      </Button>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
