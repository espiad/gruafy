import type { Metadata } from 'next';
import { RecoverForm } from './recover-form';

export const metadata: Metadata = { title: 'Recuperar contraseña' };

export default function RecuperarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">¿Olvidaste tu contraseña?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Poné tu email y te mandamos un enlace para crear una nueva.
        </p>
      </div>
      <RecoverForm />
    </div>
  );
}
