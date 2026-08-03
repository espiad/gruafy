-- =============================================================================
-- gruafy — esquema inicial
-- Postgres + Supabase. UUIDs, timestamps, soft delete donde corresponde, RLS.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('client', 'provider_owner', 'provider_driver', 'admin');
create type account_status as enum ('active', 'suspended', 'deleted');
create type provider_status as enum ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended');
create type member_role as enum ('owner', 'driver');
create type review_status as enum ('pending', 'approved', 'rejected');
create type doc_owner_kind as enum ('provider', 'truck', 'driver');
create type offer_status as enum ('pending', 'accepted', 'rejected', 'expired');
create type payment_type as enum ('gruafy_upfront');
create type payment_status as enum ('created', 'pending', 'approved', 'rejected', 'cancelled', 'refunded', 'expired');
create type refund_status as enum ('pending', 'processed', 'failed');
create type extra_status as enum ('auto_approved', 'needs_review', 'approved', 'rejected');
create type gearbox_type as enum ('manual', 'automatic', 'unknown');
create type order_state as enum (
  'draft','quoted','searching_provider','provider_reserved','awaiting_payment',
  'payment_pending','paid','provider_en_route','provider_arrived','vehicle_loaded',
  'in_transit','completion_pending','completed','no_provider','payment_expired',
  'cancelled_by_client','cancelled_by_provider','cancelled_by_admin',
  'refund_pending','refunded','disputed'
);

-- ---------------------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'client',
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table client_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  dni text,
  contact_phone text,
  identity_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  brand text not null,
  model text not null,
  year int check (year between 1950 and extract(year from now())::int + 1),
  patente text not null,
  gearbox gearbox_type not null default 'unknown',
  gearbox_locked boolean,
  has_keys boolean,
  registration_doc_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Proveedores (1 cuenta = 1 grúa habilitada)
-- ---------------------------------------------------------------------------
create table provider_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  legal_name text not null,
  cuit text not null,
  contact_email text,
  contact_phone text,
  status provider_status not null default 'draft',
  rejection_reason text,
  is_available boolean not null default false,
  last_lat double precision,
  last_lng double precision,
  last_location_at timestamptz,
  rating_avg numeric(3,2) not null default 0 check (rating_avg between 0 and 5),
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table provider_members (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider_accounts(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  role member_role not null default 'driver',
  full_name text not null,
  dni text,
  phone text,
  status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tow_trucks (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider_accounts(id) on delete cascade,
  patente text not null,
  brand text,
  model text,
  year int,
  capacity text,
  notes text,
  status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table provider_documents (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider_accounts(id) on delete cascade,
  owner_kind doc_owner_kind not null,
  truck_id uuid references tow_trucks(id) on delete cascade,
  member_id uuid references provider_members(id) on delete cascade,
  doc_type text not null,
  doc_number text,
  storage_path text not null,
  expires_at date,
  review_status review_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Órdenes de servicio
-- ---------------------------------------------------------------------------
create table service_orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete restrict,
  vehicle_id uuid references vehicles(id) on delete set null,
  origin_address text,
  origin_lat double precision,
  origin_lng double precision,
  dest_address text,
  dest_lat double precision,
  dest_lng double precision,
  dollys int not null default 0 check (dollys >= 0),
  wheels_blocked int not null default 0 check (wheels_blocked >= 0),
  conditions jsonb not null default '{}'::jsonb,
  distance_meters int,
  duration_seconds int,
  -- Snapshot económico congelado al confirmar (desglose completo).
  pricing jsonb,
  amount_upfront int check (amount_upfront >= 0),
  provider_id uuid references provider_accounts(id) on delete set null,
  driver_id uuid references provider_members(id) on delete set null,
  truck_id uuid references tow_trucks(id) on delete set null,
  state order_state not null default 'draft',
  offer_deadline timestamptz,
  payment_deadline timestamptz,
  searching_at timestamptz,
  reserved_at timestamptz,
  paid_at timestamptz,
  completed_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table provider_offers (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references service_orders(id) on delete cascade,
  provider_id uuid not null references provider_accounts(id) on delete cascade,
  rank int not null default 0,
  expires_at timestamptz not null,
  status offer_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (order_id, provider_id)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references service_orders(id) on delete cascade,
  type payment_type not null default 'gruafy_upfront',
  mp_preference_id text,
  mp_payment_id text,
  external_reference text not null,
  amount int not null check (amount >= 0),
  status payment_status not null default 'created',
  live_mode boolean not null default false,
  idempotency_key text,
  normalized jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mp_payment_id)
);

create table refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  amount int not null check (amount >= 0),
  reason text not null,
  status refund_status not null default 'pending',
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tracking_locations (
  id bigint generated always as identity primary key,
  order_id uuid not null references service_orders(id) on delete cascade,
  provider_id uuid references provider_accounts(id) on delete set null,
  driver_id uuid references provider_members(id) on delete set null,
  lat double precision not null,
  lng double precision not null,
  accuracy double precision,
  heading double precision,
  speed double precision,
  created_at timestamptz not null default now()
);

create table service_extras (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references service_orders(id) on delete cascade,
  category text not null,
  reason text not null,
  amount int not null check (amount >= 0),
  evidence_url text,
  status extra_status not null default 'needs_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references service_orders(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  target_provider_id uuid references provider_accounts(id) on delete cascade,
  target_client_id uuid references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (order_id, author_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table support_articles (
  id uuid primary key default gen_random_uuid(),
  target_role text not null default 'all',
  category text not null,
  title text not null,
  slug text not null unique,
  content text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table platform_settings (
  id int primary key default 1,
  version int not null default 1,
  values jsonb not null,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  constraint singleton check (id = 1)
);

create table order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references service_orders(id) on delete cascade,
  from_state order_state,
  to_state order_state,
  actor_role user_role,
  actor_id uuid,
  event text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create table admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_id uuid not null references profiles(id) on delete cascade,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index idx_vehicles_client on vehicles(client_id) where deleted_at is null;
create index idx_provider_status on provider_accounts(status);
create index idx_provider_available on provider_accounts(is_available, last_location_at);
create index idx_members_provider on provider_members(provider_id);
create index idx_docs_provider on provider_documents(provider_id, review_status);
create index idx_orders_client on service_orders(client_id);
create index idx_orders_provider on service_orders(provider_id);
create index idx_orders_state on service_orders(state, created_at);
create index idx_offers_order on provider_offers(order_id, status);
create index idx_payments_order on payments(order_id);
create index idx_payments_status on payments(status);
create index idx_tracking_order on tracking_locations(order_id, created_at desc);
create index idx_extras_order on service_extras(order_id);
create index idx_notifications_user on notifications(user_id, read, created_at desc);
create index idx_events_order on order_events(order_id, created_at);
