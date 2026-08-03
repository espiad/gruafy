'use client';

/**
 * Alertas perceptibles para el navegador: un beep corto (WebAudio, sin assets),
 * vibración en mobile y parpadeo del título de la pestaña. Pensadas para el
 * momento de estrés: que no se te pase que entró un pedido o cambió el estado,
 * aunque tengas el teléfono en el bolsillo o mirando otra app.
 */

let audioCtx: AudioContext | null = null;

/** Beep corto. Requiere un gesto previo del usuario para desbloquear el audio. */
export function beep(durationMs = 220, frequency = 880) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx ?? new Ctx();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    /* audio no disponible: no rompemos nada */
  }
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

/** Combo completo: beep + vibración + parpadeo del título. */
export function notify(message: string) {
  beep();
  vibrate();
  if (typeof document !== 'undefined' && document.hidden) flashTitle(message);
}
