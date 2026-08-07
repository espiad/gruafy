import { ShieldCheck } from 'lucide-react';

/**
 * Aviso para cuentas creadas con Google. Aclara qué se cambia acá y qué no:
 *
 * - El MAIL y la CONTRASEÑA vienen de Google. No los guardamos nosotros, así que
 *   no hay nada que editar de este lado: se cambian en la cuenta de Google.
 * - El nombre y el teléfono SÍ son nuestros (los usamos para que el gruero sepa a
 *   quién busca y pueda llamarlo), y se editan normalmente acá arriba.
 *
 * La distinción importa: decir "no podés editar nada" sería falso y dejaría a la
 * persona sin cambiar el teléfono con el que la van a llamar.
 */
export function GoogleAccountNotice() {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="h-4 w-4 text-brand-green" /> Entrás con Google
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tu <strong>mail</strong> y tu <strong>contraseña</strong> los maneja Google: nosotros no
        guardamos ninguna contraseña tuya, por eso no aparecen acá. Si querés cambiarlos, hacelo desde
        tu cuenta de Google y la próxima vez que entres se toma solo.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        El nombre y el teléfono de arriba sí son tuyos en gruafy y los podés editar cuando quieras:
        son los datos con los que el gruero te identifica y te llama.
      </p>
      <a
        href="https://myaccount.google.com/security"
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-lg border border-input px-3.5 py-2 text-sm font-medium hover:border-brand-green/50"
      >
        Ir a mi cuenta de Google
      </a>
    </div>
  );
}
