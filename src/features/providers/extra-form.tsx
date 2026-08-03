'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addExtra } from './actions';

const LABELS: Record<string, string> = {
  peajes: 'Peajes',
  espera: 'Espera',
  dollys_no_informados: 'Dollys no informados',
  ruedas_bloqueadas: 'Ruedas bloqueadas',
  condicion_distinta: 'Condición distinta',
  acceso_especial: 'Acceso especial',
};

export function ExtraForm({ orderId, categories }: { orderId: string; categories: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const form = e.currentTarget;
    start(async () => {
      const res = await addExtra({
        orderId,
        category: String(f.get('category')),
        reason: String(f.get('reason')),
        amount: Number(f.get('amount')),
      });
      if (res.ok) {
        form.reset();
        router.refresh();
      } else setError(res.error ?? 'No pudimos cargar el adicional');
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto_auto] sm:items-end">
      <div>
        <label className="mb-1 block text-xs font-medium">Categoría</label>
        <select name="category" required className="focus-ring h-11 w-full rounded-md border border-input bg-background px-2 text-sm">
          {categories.map((c) => (
            <option key={c} value={c}>{LABELS[c] ?? c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Motivo</label>
        <Input name="reason" required placeholder="Ej: peaje Autopista Illia" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium">Monto</label>
        <Input name="amount" inputMode="numeric" required placeholder="0" className="w-28" />
      </div>
      <Button type="submit" disabled={pending} className="h-11">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Agregar
      </Button>
      {error && <p className="text-sm text-destructive sm:col-span-4">{error}</p>}
    </form>
  );
}
