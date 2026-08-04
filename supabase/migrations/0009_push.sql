-- Suscripciones de Web Push (una por dispositivo/navegador de cada usuario).
-- Las escribe/lee solo el servidor (service role); RLS habilitado sin policies
-- para denegar por defecto a anon/usuarios.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;
