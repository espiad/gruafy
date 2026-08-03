-- =============================================================================
-- gruafy — barredor de órdenes vencidas (server-side, no depende de la pestaña)
-- Cierra búsquedas sin grúa y libera reservas sin pago. Idempotente y atómico:
-- solo toca filas que siguen en el estado esperable (no pisa una aceptación/pago
-- de último segundo). NO expira payment_pending (MP offline aprueba tarde).
-- =============================================================================

create or replace function sweep_expired_orders()
returns table(search_closed integer, payment_expired integer)
language plpgsql security definer set search_path = public as $$
declare s integer; p integer;
begin
  -- Búsquedas vencidas sin que nadie aceptara → no_provider.
  with expired as (
    update service_orders set state = 'no_provider'
    where state = 'searching_provider'
      and offer_deadline is not null and offer_deadline < now()
    returning id
  ),
  ev as (
    insert into order_events (order_id, from_state, to_state, actor_role, event)
    select id, 'searching_provider', 'no_provider', null, 'Sin grúas disponibles (venció la búsqueda)'
    from expired
  ),
  off as (
    update provider_offers set status = 'expired'
    where order_id in (select id from expired) and status = 'pending'
  )
  select count(*) into s from expired;

  -- Reservas sin pago vencidas → payment_expired (libera al gruero).
  with expired as (
    update service_orders set state = 'payment_expired'
    where state = 'awaiting_payment'
      and payment_deadline is not null and payment_deadline < now()
    returning id
  ),
  ev as (
    insert into order_events (order_id, from_state, to_state, actor_role, event)
    select id, 'awaiting_payment', 'payment_expired', null, 'Venció el tiempo de pago; se liberó la reserva'
    from expired
  )
  select count(*) into p from expired;

  return query select s, p;
end $$;
