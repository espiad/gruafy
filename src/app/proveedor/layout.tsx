import { redirect } from 'next/navigation';
import { Home, ClipboardList, Users, User, FileCheck } from 'lucide-react';
import { AppShell } from '@/components/app/app-shell';
import { type NavItem } from '@/components/app/nav-links';
import { getProfile } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

const NAV: NavItem[] = [
  { href: '/proveedor', label: 'Panel', icon: Home, exact: true },
  { href: '/proveedor/historial', label: 'Historial', icon: ClipboardList },
  { href: '/proveedor/equipo', label: 'Equipo', icon: Users },
  { href: '/proveedor/perfil', label: 'Perfil', icon: User },
];

export default async function ProveedorLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect('/ingresar?next=/proveedor');
  if (profile.role === 'admin') redirect('/admin');
  if (profile.role === 'client') redirect('/registro/proveedor');

  const supabase = await createClient();
  const { data: provider } = await supabase
    .from('provider_accounts')
    .select('id, status')
    .eq('owner_id', profile.id)
    .maybeSingle();

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null;
  const nav = provider ? NAV : [];

  return (
    <AppShell nav={nav} role="Grúa" userName={name}>
      {!provider && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
          <FileCheck className="h-4 w-4" /> Completá el alta de tu grúa para empezar.
        </div>
      )}
      {children}
    </AppShell>
  );
}
