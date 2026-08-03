import { redirect } from 'next/navigation';
import { LayoutDashboard, ShieldCheck, Truck, CreditCard, Undo2, Settings, ScrollText } from 'lucide-react';
import { AppShell } from '@/components/app/app-shell';
import { getProfile } from '@/lib/auth/session';
import type { NavItem } from '@/components/app/nav-links';

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/proveedores', label: 'Proveedores', icon: ShieldCheck },
  { href: '/admin/servicios', label: 'Servicios', icon: Truck },
  { href: '/admin/pagos', label: 'Pagos', icon: CreditCard },
  { href: '/admin/reembolsos', label: 'Reembolsos', icon: Undo2 },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
  { href: '/admin/auditoria', label: 'Auditoría', icon: ScrollText },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect('/ingresar?next=/admin');
  if (profile.role !== 'admin') redirect('/');

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Admin';
  return (
    <AppShell nav={NAV} role="Administración" userName={name}>
      {children}
    </AppShell>
  );
}
