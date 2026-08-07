import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app/app-shell';
import { getProfile } from '@/lib/auth/session';
import type { NavItem } from '@/components/app/nav-links';

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true },
  { href: '/admin/proveedores', label: 'Proveedores', icon: 'shield' },
  { href: '/admin/servicios', label: 'Servicios', icon: 'truck' },
  { href: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
  { href: '/admin/pagos', label: 'Pagos', icon: 'card' },
  { href: '/admin/reembolsos', label: 'Reembolsos', icon: 'refund' },
  { href: '/admin/configuracion', label: 'Configuración', icon: 'settings' },
  { href: '/admin/auditoria', label: 'Auditoría', icon: 'audit' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect('/ingresar?next=/admin');
  // `status` existía en el esquema pero no lo miraba nadie: suspender una cuenta
  // no tenía ningún efecto. Este es el punto por el que pasan todas las rutas privadas.
  if (profile.status !== 'active') redirect('/cuenta-bloqueada');
  if (profile.role !== 'admin') redirect('/');

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Admin';
  return (
    <AppShell nav={NAV} role="Administración" userName={name}>
      {children}
    </AppShell>
  );
}
