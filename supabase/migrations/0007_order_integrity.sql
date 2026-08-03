-- =============================================================================
-- gruafy — integridad de órdenes a nivel base (defensa contra bypass de RLS)
--
-- Problema: el anon key es público (va al navegador). RLS es row-level: un cliente
-- podía `update service_orders set state='paid'` o bajar `amount_upfront` y saltear
-- el cobro. Este trigger valida las transiciones contra el grafo de la máquina de
-- estados y congela columnas económicas/identitarias, replicando en la base la
-- lógica que hoy solo vivía en TS. Los flujos legítimos siguen andando.
-- =============================================================================

-- Grafo de transiciones permitidas (espejo de features/orders/state-machine.ts).
create table if not exists order_transitions (
  from_state order_state not null,
  to_state order_state not null,
  primary key (from_state, to_state)
);

insert into order_transitions (from_state, to_state) values
  ('draft','quoted'),
  ('quoted','searching_provider'),
  ('searching_provider','provider_reserved'),
  ('searching_provider','awaiting_payment'), -- accept_offer va directo
  ('searching_provider','no_provider'),
  ('provider_reserved','awaiting_payment'),
  ('awaiting_payment','payment_pending'),
  ('awaiting_payment','paid'),
  ('payment_pending','paid'),
  ('awaiting_payment','payment_expired'),
  ('payment_pending','payment_expired'),
  ('payment_expired','searching_provider'),
  ('paid','provider_en_route'),
  ('provider_en_route','provider_arrived'),
  ('provider_arrived','vehicle_loaded'),
  ('vehicle_loaded','in_transit'),
  ('in_transit','completion_pending'),
  ('completion_pending','completed'),
  ('paid','refund_pending'),
  ('paid','refunded'),
  ('cancelled_by_provider','refund_pending'),
  ('disputed','refund_pending'),
  ('refund_pending','refunded'),
  ('completion_pending','disputed'),
  ('completed','disputed'),
  ('searching_provider','cancelled_by_client'),
  ('provider_reserved','cancelled_by_client'),
  ('awaiting_payment','cancelled_by_client'),
  ('provider_reserved','cancelled_by_provider'),
  ('paid','cancelled_by_provider'),
  ('provider_en_route','cancelled_by_provider')
on conflict do nothing;

-- Cancelación administrativa desde cualquier estado activo.
insert into order_transitions (from_state, to_state)
select s, 'cancelled_by_admin'::order_state from unnest(array[
  'searching_provider','provider_reserved','awaiting_payment','payment_pending',
  'paid','provider_en_route','provider_arrived','vehicle_loaded','in_transit'
]::order_state[]) as s
on conflict do nothing;

-- ¿El contexto es privilegiado? (service role, o conexión sin usuario: cron/migración)
-- Un usuario final tiene auth.uid() y role 'authenticated'.
create or replace function is_privileged_ctx()
returns boolean language sql stable as $$
  select auth.uid() is null or coalesce(auth.role(), '') = 'service_role';
$$;

create or replace function enforce_order_update()
returns trigger language plpgsql as $$
declare assigning boolean;
begin
  assigning := coalesce(nullif(current_setting('gruafy.assigning', true), ''), 'false')::boolean;

  -- Columnas económicas: nunca cambian por UPDATE (se congelan al crear).
  if (new.amount_upfront is distinct from old.amount_upfront
      or new.pricing is distinct from old.pricing
      or new.client_id is distinct from old.client_id) then
    if not is_privileged_ctx() then
      raise exception 'No se pueden modificar los importes ni el titular de la orden';
    end if;
  end if;

  -- provider_id solo lo asigna accept_offer (que fija el GUC) o el servicio.
  if new.provider_id is distinct from old.provider_id then
    if not (is_privileged_ctx() or assigning) then
      raise exception 'La asignación de proveedor es interna';
    end if;
  end if;

  -- Transiciones de estado: deben existir en el grafo…
  if new.state is distinct from old.state then
    if not exists (select 1 from order_transitions t where t.from_state = old.state and t.to_state = new.state) then
      raise exception 'Transición de estado inválida: % -> %', old.state, new.state;
    end if;
    -- …y los estados sensibles (pago/reembolso) solo desde el servidor.
    if new.state in ('paid','payment_pending','refunded','refund_pending') and not is_privileged_ctx() then
      raise exception 'El estado % solo puede fijarlo el servidor', new.state;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_order_integrity on service_orders;
create trigger trg_order_integrity
  before update on service_orders
  for each row execute function enforce_order_update();

-- accept_offer debe marcar el GUC para poder asignar provider_id bajo el trigger.
create or replace function accept_offer(p_order_id uuid, p_provider_id uuid, p_pay_seconds int default 180)
returns boolean language plpgsql security definer set search_path = public as $$
declare current_state order_state;
begin
  perform set_config('gruafy.assigning', 'true', true);
  select state into current_state from service_orders where id = p_order_id for update;
  if current_state is null then raise exception 'Orden inexistente'; end if;
  if current_state <> 'searching_provider' then return false; end if;
  update provider_offers set status='accepted'
    where order_id=p_order_id and provider_id=p_provider_id and status='pending' and expires_at > now();
  if not found then return false; end if;
  update provider_offers set status='expired'
    where order_id=p_order_id and provider_id<>p_provider_id and status='pending';
  update service_orders set provider_id=p_provider_id, state='awaiting_payment',
      reserved_at=now(), payment_deadline=now()+make_interval(secs => p_pay_seconds)
    where id=p_order_id;
  insert into order_events (order_id, from_state, to_state, actor_role, event)
    values (p_order_id, 'searching_provider', 'awaiting_payment', 'provider_owner', 'Grúa aceptó el servicio');
  return true;
end $$;
