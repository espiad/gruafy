import { AppShell } from '@/components/app/app-shell';
import { getProfile } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import type { NavItem } from '@/components/app/nav-links';

const NAV: NavItem[] = [
  { href: '/cliente', label: 'Inicio', icon: 'home', exact: true },
  { href: '/cliente/solicitar', label: 'Pedir', icon: 'plus' },
  { href: '/cliente/vehiculos', label: 'Vehículos', icon: 'car' },
  { href: '/cliente/historial', label: 'Historial', icon: 'clock' },
  { href: '/cliente/perfil', label: 'Perfil', icon: 'user' },
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
