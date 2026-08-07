'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, Search, UserPlus, Lock, Ban, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setUserRole, createAdminUser, setUserBlocked, type UsuarioAdminRow } from './actions';

const ROLES: { key: 'client' | 'provider_owner' | 'admin'; label: string }[] = [
  { key: 'client', label: 'Cliente' },
  { key: 'provider_owner', label: 'Proveedor' },
  { key: 'admin', label: 'Admin' },
];

/** Fila de un usuario: muestra el rol actual y permite cambiarlo en un toque. */
function FilaUsuario({ u }: { u: UsuarioAdminRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nombre = [u.first_name, u.last_name].filter(Boolean).join(' ');

  function bloquear(activar: boolean) {
    setError(null);
    start(async () => {
      const res = await setUserBlocked({ userId: u.id, bloquear: activar });
      if (res.ok) router.refresh();
      else setError(res.error ?? 'No pudimos cambiar el estado');
    });
  }

  function cambiar(role: 'client' | 'provider_owner' | 'admin') {
    if (role === u.role) return;
    setError(null);
    start(async () => {
      const res = await setUserRole({ userId: u.id, role });
      if (res.ok) router.refresh();
      else setError(res.error ?? 'No pudimos cambiar el rol');
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{nombre || u.email || 'Sin nombre'}</p>
          <p className="truncate text-xs text-muted-foreground">{u.email || 'sin mail'}</p>
        </div>

        {u.protegido ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand-green/10 px-2.5 py-1.5 text-xs font-medium text-brand-green">
            <Lock className="h-3.5 w-3.5" /> Administración principal
          </span>
        ) : (
          <div className="flex shrink-0 gap-1">
            {ROLES.map((r) => {
              const activo = u.role === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => cambiar(r.key)}
                  disabled={pending || activo}
                  className={`focus-ring rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    activo
                      ? 'border-brand-orange bg-brand-orange/15 text-brand-green'
                      : 'border-input text-muted-foreground hover:border-brand-orange/50 hover:text-foreground disabled:opacity-50'
                  }`}
                >
                  {pending && !activo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : r.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span
          className={`text-xs font-medium ${
            u.status === 'active' ? 'text-muted-foreground' : 'text-destructive'
          }`}
        >
          {u.status === 'active' ? 'Activa' : u.status === 'deleted' ? 'Eliminada por el titular' : 'Bloqueada'}
        </span>
        {!u.protegido && u.status !== 'deleted' && (
          <button
            onClick={() => bloquear(u.status === 'active')}
            disabled={pending}
            className={`focus-ring inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
              u.status === 'active'
                ? 'text-destructive hover:bg-destructive/10'
                : 'text-success hover:bg-success/10'
            }`}
          >
            {u.status === 'active' ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
            {u.status === 'active' ? 'Bloquear' : 'Desbloquear'}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Alta de un administrador nuevo (mail + contraseña, entra en el acto). */
function NuevoAdmin() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    start(async () => {
      const res = await createAdminUser({
        email: String(f.get('email') ?? ''),
        password: String(f.get('password') ?? ''),
        firstName: String(f.get('firstName') ?? ''),
        lastName: String(f.get('lastName') ?? ''),
      });
      if (res.ok) {
        setOk(`Listo. ${String(f.get('email'))} ya puede entrar con esa contraseña.`);
        form.reset();
        router.refresh();
      } else setError(res.error ?? 'No pudimos crear el administrador');
    });
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> Crear administrador
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-brand-green" />
        <h2 className="font-semibold">Nuevo administrador</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Va a tener exactamente los mismos permisos que vos. Entra directo con este mail y contraseña,
        sin confirmar el correo.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Nombre</Label>
          <Input id="firstName" name="firstName" autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Apellido</Label>
          <Input id="lastName" name="lastName" autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="text" required minLength={8} autoComplete="off" />
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres. Pasásela por un canal seguro.</p>
        </div>
      </div>
      {ok && <p className="rounded-md bg-success/10 p-3 text-sm text-success">{ok}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Crear administrador
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cerrar
        </Button>
      </div>
    </form>
  );
}

export function UsersManager({ users, query }: { users: UsuarioAdminRow[]; query: string }) {
  const router = useRouter();
  const [q, setQ] = useState(query);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/admin/usuarios?q=${encodeURIComponent(q.trim())}` : '/admin/usuarios');
  }

  return (
    <div className="space-y-5">
      <NuevoAdmin />

      <form onSubmit={buscar} className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por mail o nombre"
          className="h-11"
        />
        <Button type="submit" variant="outline" className="h-11">
          <Search className="h-4 w-4" /> Buscar
        </Button>
      </form>

      {users.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No hay usuarios que coincidan.
        </p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <FilaUsuario key={u.id} u={u} />
          ))}
        </div>
      )}
    </div>
  );
}
