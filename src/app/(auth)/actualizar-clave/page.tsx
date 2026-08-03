import type { Metadata } from 'next';
import { UpdatePasswordForm } from './update-password-form';

export const metadata: Metadata = { title: 'Nueva contraseña' };

export default function ActualizarClavePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Creá una nueva contraseña</h1>
        <p className="mt-1 text-sm text-muted-foreground">Elegí una contraseña de al menos 8 caracteres.</p>
      </div>
      <UpdatePasswordForm />
    </div>
  );
}
