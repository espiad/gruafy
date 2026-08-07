import { listUsers } from '@/features/admin/actions';
import { UsersManager } from '@/features/admin/users-manager';

export const metadata = { title: 'Usuarios · gruafy' };

export default async function AdminUsuarios({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q ?? '';
  const users = await listUsers(query);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-2xl">Usuarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cambiá el rol de una cuenta o dá de alta administradores. Pasar a <strong>Proveedor</strong>{' '}
          habilita el alta de la grúa; volver a <strong>Cliente</strong> no borra nada, solo le saca el
          acceso al panel.
        </p>
      </div>
      <UsersManager users={users} query={query} />
    </div>
  );
}
