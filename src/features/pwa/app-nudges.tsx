'use client';

import { useEffect, useState } from 'react';
import { Bell, Share, Plus, X, Download } from 'lucide-react';

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}
function isIOS() {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Nudges de PWA para usuarios logueados: registra el service worker, pide permiso
 * de notificaciones con una EXPLICACIÓN amable ANTES del prompt nativo, y sugiere
 * instalar la app en el inicio (con el how-to según iOS/Android). Todo desestimable.
 */
export function AppNudges() {
  const [notifState, setNotifState] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [notifDismissed, setNotifDismissed] = useState(true);
  const [installDismissed, setInstallDismissed] = useState(true);
  const [standalone, setStandalone] = useState(true);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);

  useEffect(() => {
    // Registrar el service worker (para instalación y push futuro).
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    setStandalone(isStandalone());
    if ('Notification' in window) {
      setNotifState(Notification.permission);
      setNotifDismissed(Notification.permission !== 'default' || localStorage.getItem('gruafy_notif_nudge') === '1');
    }
    setInstallDismissed(isStandalone() || localStorage.getItem('gruafy_install_nudge') === '1');

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    return () => window.removeEventListener('beforeinstallprompt', onBIP);
  }, []);

  async function askNotifications() {
    if (!('Notification' in window)) return;
    const res = await Notification.requestPermission();
    setNotifState(res);
    setNotifDismissed(true);
    if (res === 'granted') {
      try {
        new Notification('gruafy', { body: '¡Listo! Te vamos a avisar de las novedades.', icon: '/isologo.png' });
      } catch {
        /* ignore */
      }
    }
  }
  function dismissNotif() {
    localStorage.setItem('gruafy_notif_nudge', '1');
    setNotifDismissed(true);
  }

  async function install() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      setInstallDismissed(true);
      localStorage.setItem('gruafy_install_nudge', '1');
    } else if (isIOS()) {
      setShowIosHelp(true);
    }
  }
  function dismissInstall() {
    localStorage.setItem('gruafy_install_nudge', '1');
    setInstallDismissed(true);
  }

  const showNotif = notifState === 'default' && !notifDismissed;
  const showInstall = !standalone && !installDismissed && (deferred !== null || isIOS());

  if (!showNotif && !showInstall) return null;

  return (
    <div className="space-y-3">
      {showNotif && (
        <div className="rounded-2xl border border-brand-green/30 bg-brand-green/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Bell className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
              <div>
                <p className="text-sm font-semibold">Activá las notificaciones</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Te avisamos al toque cuando una grúa acepta, cuando llega, o cuando entra un pedido.
                  Vas a poder aceptarlo apenas te lo pida el navegador.
                </p>
                <button onClick={askNotifications} className="focus-ring mt-2 rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-brand-cream">
                  Activar notificaciones
                </button>
              </div>
            </div>
            <button onClick={dismissNotif} aria-label="Ahora no" className="focus-ring rounded-md p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showInstall && (
        <div className="rounded-2xl border border-brand-orange/40 bg-brand-orange/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Download className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
              <div>
                <p className="text-sm font-semibold">Instalá gruafy en tu inicio</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Se abre como una app, más rápido y a un toque. No ocupa casi nada.
                </p>
                {showIosHelp ? (
                  <p className="mt-2 flex flex-wrap items-center gap-1 text-xs">
                    Tocá <Share className="inline h-3.5 w-3.5" /> <strong>Compartir</strong> abajo, y elegí
                    <Plus className="inline h-3.5 w-3.5" /> <strong>Agregar a inicio</strong>.
                  </p>
                ) : (
                  <button onClick={install} className="focus-ring mt-2 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-brand-ink">
                    {isIOS() ? 'Cómo instalarla' : 'Instalar app'}
                  </button>
                )}
              </div>
            </div>
            <button onClick={dismissInstall} aria-label="Ahora no" className="focus-ring rounded-md p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
