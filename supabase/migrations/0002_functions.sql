-- =============================================================================
-- gruafy — funciones, triggers y RPCs
-- =============================================================================

-- updated_at automático
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','client_profiles','vehicles','provider_accounts','provider_members',
    'tow_trucks','provider_documents','service_orders','payments','refunds',
    'service_extras','support_articles'
  ] loop
    execute format('create trigger trg_%1$s_updated before update on %1$s
      for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- ¿El usuario actual es admin? (SECURITY DEFINER evita recursión de RLS)
create or replace function is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = uid and role = 'admin');
$$;

-- Rol del usuario actual
create or replace function current_role_of(uid uuid default auth.uid())
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = uid;
$$;

-- ¿El usuario es dueño o conductor del proveedor dado?
create or replace function is_provider_member(pid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from provider_accounts pa where pa.id = pid and pa.owner_id = uid
    union
    select 1 from provider_members pm where pm.provider_id = pid and pm.user_id = uid
  );
$$;

-- Al crear un usuario en auth, crear su profile con el rol correcto:
--  - admin si el email coincide con ADMIN_EMAIL (config del proyecto);
--  - provider_owner si se registró desde el alta de proveedor (intended_role);
--  - client en cualquier otro caso.
-- El rol admin nunca puede pedirse desde metadata: solo por ADMIN_EMAIL.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  admin_email text;
  intended text;
  final_role user_role;
begin
  admin_email := nullif(current_setting('app.admin_email', true), '');
  intended := new.raw_user_meta_data->>'intended_role';

  if admin_email is not null and lower(new.email) = lower(admin_email) then
    final_role := 'admin';
  elsif intended = 'provider_owner' then
    final_role := 'provider_owner';
  else
    final_role := 'client';
  end if;

  insert into profiles (id, role, first_name, last_name, phone)
  values (
    new.id,
    final_role,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    nullif(new.raw_user_meta_data->>'phone', '')
  );
  if final_role = 'client' then
    insert into client_profiles (id) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;

create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Límite de 5 conductores por proveedor (regla transaccional)
create or replace function enforce_member_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from provider_members
      where provider_id = new.provider_id and role = 'driver'
        and status <> 'deleted') >= 5 then
    raise exception 'Un proveedor admite como máximo 5 conductores';
  end if;
  return new;
end $$;

create trigger trg_member_limit
  before insert on provider_members
  for each row when (new.role = 'driver')
  execute function enforce_member_limit();

-- -------------------------------------------------------------------------
-- Aceptación atómica de una oferta: previene doble aceptación con bloqueo.
-- Devuelve true si este proveedor logró reservar la orden.
-- -------------------------------------------------------------------------
create or replace function accept_offer(p_order_id uuid, p_provider_id uuid, p_pay_seconds int default 180)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_state order_state;
begin
  -- Bloquea la fila de la orden hasta el fin de la transacción.
  select state into current_state from service_orders where id = p_order_id for update;
  if current_state is null then raise exception 'Orden inexistente'; end if;
  if current_state <> 'searching_provider' then
    return false; -- ya fue tomada, cancelada o expirada
  end if;

  -- Verifica que exista una oferta pendiente y vigente para este proveedor.
  update provider_offers
    set status = 'accepted'
    where order_id = p_order_id and provider_id = p_provider_id
      and status = 'pending' and expires_at > now();
  if not found then return false; end if;

  update provider_offers set status = 'expired'
    where order_id = p_order_id and provider_id <> p_provider_id and status = 'pending';

  update service_orders set
      provider_id = p_provider_id,
      state = 'awaiting_payment',
      reserved_at = now(),
      payment_deadline = now() + make_interval(secs => p_pay_seconds)
    where id = p_order_id;

  insert into order_events (order_id, from_state, to_state, actor_role, event)
    values (p_order_id, 'searching_provider', 'awaiting_payment', 'provider', 'Grúa aceptó el servicio');

  return true;
end $$;
