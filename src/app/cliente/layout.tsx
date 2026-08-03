import { Home, PlusCircle, Car, Clock, User } from 'lucide-react';
import { AppShell } from '@/components/app/app-shell';
import { getProfile } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import type { NavItem } from '@/components/app/nav-links';

const NAV: NavItem[] = [
  { href: '/cliente', label: 'Inicio', icon: Home, exact: true },
  { href: '/cliente/solicitar', label: 'Pedir', icon: PlusCircle },
  { href: '/cliente/vehiculos', label: 'Vehículos', icon: Car },
  { href: '/cliente/historial', label: 'Historial', icon: Clock },
  { href: '/cliente/perfil', label: 'Perfil', icon: User },
];

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect('/ingresar?next=/cliente');
  // Los proveedores y admins tienen su propia área.
  if (profile.role === 'admin') redirect('/admin');
  if (profile.role === 'provider_owner' || profile.role === 'provider_driver') redirect('/proveedor');

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null;
  return (
    <AppShell nav={NAV} role="Cliente" userName={name}>
      {children}
    </AppShell>
  );
}
