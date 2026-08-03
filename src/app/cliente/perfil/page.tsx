import type { Metadata } from 'next';
import { getProfile } from '@/lib/auth/session';
import { ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Mi perfil' };

export default async function PerfilPage() {
  const profile = await getProfile();
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-display text-2xl">Mi perfil</h1>
      <ProfileForm
        initial={{
          first_name: profile?.first_name ?? '',
          last_name: profile?.last_name ?? '',
          phone: profile?.phone ?? '',
        }}
      />
    </div>
  );
}
