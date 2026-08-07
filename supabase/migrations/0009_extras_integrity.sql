-- Integridad de los adicionales, del lado de la BASE.
--
-- La policy `extras_write` es `for all` con la única condición "la orden es mía",
-- así que toda la validación anti-fraude (catálogo cerrado, rangos, tope de
-- cantidad, estados editables) vivía SOLO en el server action `addExtra`. La anon
-- key viaja al navegador por diseño: un gruero con la consola abierta podía hacer
-- un INSERT directo a `service_extras` con el monto que quisiera —incluso sobre un
-- servicio ya terminado— y el cliente lo veía sumado a lo que tenía que pagar en
-- efectivo. Esto lo cierra en la base, donde no se puede esquivar.

create or replace function enforce_extra_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_state order_state;
  v_max numeric;
begin
  -- El service role (webhooks, acciones de administración) queda exento: el admin
  -- carga adicionales fuera de catálogo a propósito, acordados con las partes.
  if is_privileged_ctx() then
    return new;
  end if;

  select state into v_state from service_orders where id = new.order_id;
  if v_state is null then
    raise exception 'La orden no existe';
  end if;

  -- Solo mientras el servicio está en curso. Después de cerrarlo (o si se canceló)
  -- no se puede inflar lo que el cliente tiene que pagar.
  if v_state not in ('paid','provider_en_route','provider_arrived','vehicle_loaded','in_transit','completion_pending') then
    raise exception 'El servicio no está en curso: no se pueden cargar adicionales';
  end if;

  if new.amount is null or new.amount <= 0 then
    raise exception 'El monto del adicional tiene que ser mayor a cero';
  end if;

  -- Techo duro: el mayor `max` del catálogo configurado por el admin. No replica
  -- la validación por categoría (eso lo hace el server action con el catálogo
  -- completo), pero corta de raíz el monto inventado.
  select coalesce(max((a->>'max')::numeric), 0)
    into v_max
    from platform_settings ps,
         lateral jsonb_array_elements(coalesce(ps.values->'adicionales', '[]'::jsonb)) a
   where ps.id = 1;

  if v_max > 0 and new.amount > v_max then
    raise exception 'El monto supera el máximo permitido para un adicional (%)', v_max;
  end if;

  -- Un gruero no decide el estado de su propio adicional.
  new.status := 'auto_approved';
  return new;
end $$;

drop trigger if exists trg_extra_integrity on service_extras;
create trigger trg_extra_integrity
  before insert or update on service_extras
  for each row execute function enforce_extra_integrity();

-- Borrar un adicional ya cargado tampoco es del gruero: si se equivocó, lo saca
-- un administrador (queda auditado).
drop policy if exists extras_write on service_extras;
create policy extras_write on service_extras for insert
  with check (
    exists (
      select 1 from service_orders o
       where o.id = service_extras.order_id
         and o.provider_id is not null
         and is_provider_member(o.provider_id)
    )
  );
