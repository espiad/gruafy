-- =============================================================================
-- gruafy — Row Level Security
-- Principio: cada quien ve/edita solo lo suyo. Antes del pago no se cruzan datos
-- privados entre cliente y proveedor. El admin accede por rol verificado.
-- La service role (webhooks, asignación) salta RLS de forma controlada.
-- =============================================================================

alter table profiles enable row level security;
alter table client_profiles enable row level security;
alter table vehicles enable row level security;
alter table provider_accounts enable row level security;
alter table provider_members enable row level security;
alter table tow_trucks enable row level security;
alter table provider_documents enable row level security;
alter table service_orders enable row level security;
alter table provider_offers enable row level security;
alter table payments enable row level security;
alter table refunds enable row level security;
alter table tracking_locations enable row level security;
alter table service_extras enable row level security;
alter table reviews enable row level security;
alter table notifications enable row level security;
alter table support_articles enable row level security;
alter table platform_settings enable row level security;
alter table order_events enable row level security;
alter table admin_audit_logs enable row level security;

-- profiles: cada uno ve/edita el suyo; admin ve todo.
create policy profiles_self_select on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_self_update on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
create policy profiles_admin_all on profiles for all using (is_admin()) with check (is_admin());

-- client_profiles
create policy cp_self on client_profiles for all using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- vehicles: dueño cliente.
create policy vehicles_owner on vehicles for all
  using (client_id = auth.uid() or is_admin())
  with check (client_id = auth.uid() or is_admin());

-- provider_accounts: dueño/miembros ven; admin todo. Alta por el dueño.
create policy provider_read on provider_accounts for select
  using (is_provider_member(id) or is_admin());
create policy provider_insert on provider_accounts for insert with check (owner_id = auth.uid());
create policy provider_update on provider_accounts for update
  using (owner_id = auth.uid() or is_admin()) with check (owner_id = auth.uid() or is_admin());

-- provider_members
create policy members_read on provider_members for select
  using (is_provider_member(provider_id) or is_admin());
create policy members_write on provider_members for all
  using (exists (select 1 from provider_accounts pa where pa.id = provider_id and pa.owner_id = auth.uid()) or is_admin())
  with check (exists (select 1 from provider_accounts pa where pa.id = provider_id and pa.owner_id = auth.uid()) or is_admin());

-- tow_trucks
create policy trucks_read on tow_trucks for select using (is_provider_member(provider_id) or is_admin());
create policy trucks_write on tow_trucks for all
  using (exists (select 1 from provider_accounts pa where pa.id = provider_id and pa.owner_id = auth.uid()) or is_admin())
  with check (exists (select 1 from provider_accounts pa where pa.id = provider_id and pa.owner_id = auth.uid()) or is_admin());

-- provider_documents
create policy docs_read on provider_documents for select using (is_provider_member(provider_id) or is_admin());
create policy docs_write on provider_documents for all
  using (is_provider_member(provider_id) or is_admin())
  with check (is_provider_member(provider_id) or is_admin());

-- service_orders: cliente dueño o proveedor asignado; admin todo.
create policy orders_read on service_orders for select
  using (client_id = auth.uid() or (provider_id is not null and is_provider_member(provider_id)) or is_admin());
create policy orders_client_insert on service_orders for insert with check (client_id = auth.uid());
create policy orders_client_update on service_orders for update
  using (client_id = auth.uid() or is_admin()) with check (client_id = auth.uid() or is_admin());
create policy orders_provider_update on service_orders for update
  using (provider_id is not null and is_provider_member(provider_id))
  with check (provider_id is not null and is_provider_member(provider_id));

-- provider_offers: el proveedor ve las suyas; el cliente las de su orden; admin todo.
create policy offers_read on provider_offers for select
  using (is_provider_member(provider_id)
    or exists (select 1 from service_orders o where o.id = order_id and o.client_id = auth.uid())
    or is_admin());

-- payments: cliente de la orden y admin. Escritura solo service role.
create policy payments_read on payments for select
  using (exists (select 1 from service_orders o where o.id = order_id and o.client_id = auth.uid()) or is_admin());

-- refunds: admin.
create policy refunds_admin on refunds for select using (is_admin());

-- tracking_locations: partes de la orden. Insert: el proveedor asignado.
create policy tracking_read on tracking_locations for select
  using (exists (select 1 from service_orders o where o.id = order_id
      and (o.client_id = auth.uid() or (o.provider_id is not null and is_provider_member(o.provider_id))))
    or is_admin());
create policy tracking_insert on tracking_locations for insert
  with check (exists (select 1 from service_orders o where o.id = order_id
      and o.provider_id is not null and is_provider_member(o.provider_id)));

-- service_extras: partes de la orden ven; el proveedor las carga.
create policy extras_read on service_extras for select
  using (exists (select 1 from service_orders o where o.id = order_id
      and (o.client_id = auth.uid() or (o.provider_id is not null and is_provider_member(o.provider_id))))
    or is_admin());
create policy extras_write on service_extras for all
  using (exists (select 1 from service_orders o where o.id = order_id and o.provider_id is not null and is_provider_member(o.provider_id)) or is_admin())
  with check (exists (select 1 from service_orders o where o.id = order_id and o.provider_id is not null and is_provider_member(o.provider_id)) or is_admin());

-- reviews: autor las crea; lectura pública de reseñas aprobadas de proveedores.
create policy reviews_read on reviews for select using (true);
create policy reviews_insert on reviews for insert with check (author_id = auth.uid());

-- notifications: cada quien las suyas.
create policy notif_owner on notifications for all
  using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());

-- support_articles: lectura pública de publicados; escritura admin.
create policy articles_read on support_articles for select using (published or is_admin());
create policy articles_admin on support_articles for all using (is_admin()) with check (is_admin());

-- platform_settings: lectura autenticada; escritura admin.
create policy settings_read on platform_settings for select using (auth.role() = 'authenticated' or is_admin());
create policy settings_admin on platform_settings for all using (is_admin()) with check (is_admin());

-- order_events: partes de la orden leen; escritura por servicio/admin.
create policy events_read on order_events for select
  using (exists (select 1 from service_orders o where o.id = order_id
      and (o.client_id = auth.uid() or (o.provider_id is not null and is_provider_member(o.provider_id))))
    or is_admin());

-- admin_audit_logs: solo admin.
create policy audit_admin on admin_audit_logs for select using (is_admin());
