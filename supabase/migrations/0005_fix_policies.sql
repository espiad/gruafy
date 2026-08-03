-- =============================================================================
-- gruafy — políticas faltantes detectadas en auditoría
-- Corrige inserts/updates que fallaban silenciosamente por falta de policy.
-- =============================================================================

-- order_events: las partes de la orden (cliente, proveedor asignado) o el admin
-- pueden anexar eventos al historial de SU orden.
create policy events_insert on order_events for insert
  with check (
    exists (
      select 1 from service_orders o
      where o.id = order_id
        and (
          o.client_id = auth.uid()
          or (o.provider_id is not null and is_provider_member(o.provider_id))
        )
    )
    or is_admin()
  );

-- provider_offers: el proveedor puede actualizar (rechazar) sus propias ofertas.
create policy offers_update on provider_offers for update
  using (is_provider_member(provider_id))
  with check (is_provider_member(provider_id));
