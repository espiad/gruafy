'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { signOutAction } from '@/features/orders/actions';
import { NavLinks, type NavItem } from './nav-links';

/**
 * Menú hamburguesa para mobile en las áreas con muchas secciones (admin). La barra
 * inferior sirve para 4-5 ítems, pero el admin tiene el doble y quedaba ilegible.
 *
 * El panel se monta en <body> con un portal: dentro del header lo recortaría el
 * contenedor sticky.
 */
export function AppMobileDrawer({ nav, role, userName }: { nav: NavItem[]; role: string; userName?: string | null }) {
  const [open, setOpen] = useState(false);
  const [montado, setMontado] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMontado(true), []);
  // Al navegar a otra sección, cerramos el menú (si no, queda abierto sobre la nueva).
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const panel = (
    <div className="fixed inset-0 z-[60] bg-brand-ink/50" onClick={() => setOpen(false)}>
      <nav
        className="ml-auto flex h-full w-72 max-w-[85%] flex-col bg-card p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{role}</p>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="focus-ring rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <NavLinks items={nav} className="mt-3 flex-1 space-y-1 overflow-y-auto" />

        <div className="border-t border-border pt-3">
          {userName && <p className="px-3 py-1 text-sm font-medium">{userName}</p>}
          <form action={signOutAction}>
            <button
              type="submit"
              className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </form>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={open}
        className="focus-ring rounded-md p-2 text-brand-green hover:bg-brand-green/10"
      >
        <Menu className="h-6 w-6" />
      </button>
      {open && montado && createPortal(panel, document.body)}
    </>
  );
}
