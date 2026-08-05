'use client';

/**
 * Alertas perceptibles para el navegador: un beep corto (WebAudio, sin assets),
 * vibración en mobile y parpadeo del título de la pestaña. Pensadas para el
 * momento de estrés: que no se te pase que entró un pedido o cambió el estado,
 * aunque tengas el teléfono en el bolsillo o mirando otra app.
 */

let audioCtx: AudioContext | null = null;

function ctxOrNull(): AudioContext | null {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = audioCtx ?? new Ctx();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Desbloqueo del audio: los navegadores arrancan el AudioContext "suspendido"
 * hasta un gesto real del usuario. Enganchamos el PRIMER toque/tecla para
 * resumirlo (y un beep inaudible), así los avisos posteriores suenan de verdad.
 */
if (typeof window !== 'undefined') {
  const unlock = () => {
    const ctx = ctxOrNull();
    if (ctx && ctx.state === 'running') {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    }
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock);
}

/** Un tono. Volumen alto (0.7) para que se oiga de verdad. */
function tone(ctx: AudioContext, frequency: number, start: number, durationMs: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle'; // más presente/audible que la sine
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.7, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + durationMs / 1000);
}

/** Beep de alerta: dos tonos ascendentes, bien audibles. */
export function beep() {
  const ctx = ctxOrNull();
  if (!ctx) return;
  const t = ctx.currentTime;
  tone(ctx, 780, t, 180);
  tone(ctx, 1040, t + 0.16, 240);
}

/** Vibración (mobile). En desktop no hace nada. */
export function vibrate(pattern: number | number[] = [180, 90, 180]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* sin soporte */
  }
}

/**
 * Parpadea el título de la pestaña con un mensaje hasta que la pestaña vuelve a
 * estar visible. Útil cuando el usuario está en otra pestaña/app.
 */
export function flashTitle(message: string, restoreAfterMs = 15000) {
  if (typeof document === 'undefined') return;
  const original = document.title;
  let on = false;
  const id = window.setInterval(() => {
    document.title = on ? original : message;
    on = !on;
  }, 900);
  const stop = () => {
    window.clearInterval(id);
    document.title = original;
    document.removeEventListener('visibilitychange', onVisible);
  };
  const onVisible = () => {
    if (!document.hidden) stop();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.setTimeout(stop, restoreAfterMs);
}

/** Combo completo: beep + vibración + parpadeo del título + notificación del SO. */
export function notify(message: string) {
  beep();
  vibrate();
  // Notificación del SO solo cuando la pestaña NO está visible (evita el banner
  // redundante si el usuario ya está mirando la app). El parpadeo del título
  // acompaña en ese mismo caso.
  if (typeof document !== 'undefined' && document.hidden) {
    flashTitle(message);
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('gruafy', { body: message, icon: '/isologo.png' });
      }
    } catch {
      /* sin soporte */
    }
  }
}
