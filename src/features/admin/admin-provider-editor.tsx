'use client';

import { useState, useTransition } from 'react';
import { Loader2, Pencil, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminUpdateProvider, adminSetUserEmail } from './actions';

interface Company {
  providerId: string;
  legal_name: string;
  cuit: string;
  contact_email: string | null;
  contact_phone: string | null;
}

/** Edición admin de los datos de la empresa + el email de login del dueño. */
export function AdminProviderEditor({ company, userId, loginEmail }: { company: Company; userId: string | null; loginEmail: string | null }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [emailEditing, setEmailEditing] = useState(false);
  const [email, setEmail] = useState(loginEmail ?? '');
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function saveCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const f = new FormData(e.currentTarget);
    start(async () => {
      const res = await adminUpdateProvider({
        providerId: company.providerId,
        legal_name: String(f.get('legal_name') ?? ''),
        cuit: String(f.get('cuit') ?? ''),
        contact_email: String(f.get('contact_email') ?? ''),
        contact_phone: String(f.get('contact_phone') ?? ''),
      });
      if (res.ok) {
        setOk('Datos de la empresa actualizados.');
        setEditing(false);
      } else setError(res.error ?? 'No pudimos guardar');
    });
  }

  function saveEmail() {
    if (!userId) return;
    setError(null);
    setOk(null);
    start(async () => {
      const res = await adminSetUserEmail(userId, email.trim());
      if (res.ok) {
        setOk('Email de login actualizado.');
        setEmailEditing(false);
      } else setError(res.error ?? 'No pudimos cambiar el email');
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Editar datos de la empresa</h2>
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        )}
      </div>

      {editing && (
        <form onSubmit={saveCompany} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="legal_name">Razón social</Label>
            <Input id="legal_name" name="legal_name" required defaultValue={company.legal_name} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cuit">CUIT</Label>
              <Input id="cuit" name="cuit" required defaultValue={company.cuit} inputMode="numeric" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_phone">Teléfono</Label>
              <Input id="contact_phone" name="contact_phone" required defaultValue={company.contact_phone ?? ''} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_email">Email de contacto</Label>
            <Input id="contact_email" name="contact_email" type="email" defaultValue={company.contact_email ?? ''} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {/* Email de login (auth) — por si lo cargaron mal */}
      {userId && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">Email de acceso (login)</p>
          {emailEditing ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 w-64" />
              <Button size="sm" onClick={saveEmail} disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar</Button>
              <Button size="sm" variant="ghost" onClick={() => setEmailEditing(false)}>Cancelar</Button>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /> {loginEmail ?? '—'}</span>
              <Button size="sm" variant="outline" onClick={() => setEmailEditing(true)}><Pencil className="h-3.5 w-3.5" /> Cambiar</Button>
            </div>
          )}
        </div>
      )}

      {ok && <p className="flex items-center gap-1 text-sm text-success"><CheckCircle2 className="h-4 w-4" /> {ok}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
