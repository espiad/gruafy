'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Share, Plus, X, Download } from 'lucide-react';
import { savePushSubscription } from '@/features/push/actions';

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Suscribe el navegador a push (con la clave VAPID) y guarda la suscripción. */
async function subscribeToPush() {
  try {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      }));
    await savePushSubscription(sub.toJSON(), navigator.userAgent);
  } catch {
    /* sin push disponible: seguimos con las notificaciones en primer plano */
  }
}

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
      // Si ya dio permiso antes, aseguramos que exista la suscripción de push.
      if (Notification.permission === 'granted') void subscribeToPush();
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
      void subscribeToPush();
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

  function reopen() {
    localStorage.removeItem('gruafy_notif_nudge');
    localStorage.removeItem('gruafy_install_nudge');
    setNotifDismissed(false);
    setInstallDismissed(false);
  }

  if (!showNotif && !showInstall) {
    // Notificaciones BLOQUEADAS: el navegador ya no vuelve a preguntar, así que hay
    // que explicar cómo desbloquearlas a mano (si no, el usuario nunca entiende por
    // qué no le llegan avisos).
    if (notifState === 'denied') {
      return (
        <details className="rounded-xl border border-border bg-card p-3">
          <summary className="focus-ring flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-brand-green">
            <BellOff className="h-3.5 w-3.5" /> Tenés las notificaciones bloqueadas
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Las bloqueaste en este navegador y por eso no te avisamos cuando una grúa acepta o entra un
            pedido. Para reactivarlas: tocá el <strong>candado 🔒</strong> (o el ícono de ajustes) al lado
            de la dirección web, buscá <strong>Notificaciones</strong> y ponelas en <strong>Permitir</strong>.
            Después recargá la página.
          </p>
        </details>
      );
    }
    // Si los cerró pero todavía puede activarlos, dejamos un acceso chico (no es una
    // única chance). Si ya activó e instaló todo, no mostramos nada.
    const canReopen = (notifState === 'default' && notifDismissed) || (!standalone && installDismissed && (deferred !== null || isIOS()));
    if (!canReopen) return null;
    return (
      // Chip con borde propio: pegado al de al lado, los dos enlaces sueltos se
      // leían como un único botón larguísimo.
      <button onClick={reopen} className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-brand-green/40 hover:text-brand-green">
        <Bell className="h-3.5 w-3.5" /> Activar avisos
      </button>
    );
  }

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
