import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { signOutAction } from '@/features/orders/actions';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { NavLinks, type NavItem } from './nav-links';

interface Props {
  nav: NavItem[];
  role: string;
  userName?: string | null;
  children: React.ReactNode;
}

/** Layout de las áreas privadas: sidebar en desktop, barra inferior en mobile. */
export function AppShell({ nav, role, userName, children }: Props) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/30 md:flex-row">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="border-b border-border p-5">
          <Link href="/" className="focus-ring rounded-md">
            <Logo variant="green" />
          </Link>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{role}</p>
        </div>
        <NavLinks items={nav} className="flex-1 space-y-1 p-3" />
        <div className="border-t border-border p-3">
          {userName && <p className="px-3 py-2 text-sm font-medium">{userName}</p>}
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <Link href="/" className="focus-ring rounded-md">
          <Logo variant="green" />
        </Link>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="icon" aria-label="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </header>

      <main className="flex-1 pb-24 md:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card md:hidden">
        <NavLinks items={nav} variant="bottom" className="flex justify-around p-1" />
      </nav>
    </div>
  );
}
