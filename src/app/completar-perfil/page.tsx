import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth/session';
import { CompleteProfileForm } from '@/features/auth/complete-profile-form';

export const metadata: Metadata = { title: 'Completá tu perfil' };

export default async function CompletarPerfil({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const profile = await getProfile();
  if (!profile) redirect('/ingresar?next=/completar-perfil');

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl">Completá tu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Un par de datos para poder asistirte bien. Solo esta vez.
        </p>
      </div>
      <CompleteProfileForm
        next={next ?? '/cliente'}
        defaults={{
          first_name: profile.first_name ?? '',
          last_name: profile.last_name ?? '',
          phone: profile.phone ?? '',
        }}
      />
    </div>
  );
}
