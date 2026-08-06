'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

interface Item {
  href: string;
  label: string;
}

/**
 * Menú hamburguesa para mobile. En pantallas chicas los enlaces de navegación no
 * entraban en la barra y quedaban ocultos; acá se despliegan en un panel. Los
 * accesos de cuenta (Ingresar / Registrate) quedan SIEMPRE visibles fuera del
 * menú, porque son las acciones que más se tocan.
 */
export function MobileNav({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  // Con el panel abierto, bloqueamos el scroll del fondo.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  /**
   * Al tocar un enlace de ancla de la propia landing, cerramos el panel y hacemos
   * el scroll nosotros. Si dejáramos que lo haga el navegador, el salto ocurre
   * mientras el body todavía tiene el scroll bloqueado (por el menú abierto) y se
   * pierde: cambiaba la URL pero la página no se movía.
   */
  function irA(e: React.MouseEvent, href: string) {
    const i = href.indexOf('#');
    const enLanding = typeof window !== 'undefined' && window.location.pathname === '/';
    if (i < 0 || !enLanding) {
      setOpen(false);
      return;
    }
    e.preventDefault();
    const hash = href.slice(i);
    setOpen(false);
    document.body.style.overflow = ''; // liberamos el scroll ANTES de mover la página
    // setTimeout y no requestAnimationFrame: rAF no se dispara si la pestaña no
    // está visible, y el scroll quedaría sin hacerse.
    setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', hash);
    }, 10);
  }

  // El panel se monta en <body> con un portal. Si quedara dentro del header, el
  // `backdrop-blur` de la barra crea un contenedor para `position: fixed` y el
  // panel se recorta a la altura del header (64px) en vez de ocupar la pantalla.
  const panel = (
    <div className="fixed inset-0 z-[60] bg-brand-ink/50" onClick={() => setOpen(false)}>
      <nav
        className="ml-auto flex h-full w-72 max-w-[85%] flex-col bg-background p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Menú</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="focus-ring rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="mt-4 space-y-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={(e) => irA(e, item.href)}
                className="focus-ring block rounded-lg px-3 py-3 text-base font-medium text-brand-green hover:bg-brand-orange/10"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={open}
        className="focus-ring rounded-md p-2 text-brand-green hover:bg-brand-green/10"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && montado && createPortal(panel, document.body)}
    </div>
  );
}
