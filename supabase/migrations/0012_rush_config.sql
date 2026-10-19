-- Configuración editable de la landing RUSH × Frankia (temporal, ajena a gruafy).
-- Hoy guarda la URL de la ticketera a la que lleva el botón de preventa.
-- Para eliminarlo: drop table if exists rush_config;

create table if not exists rush_config (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

-- RLS sin políticas: solo el servidor (service role) lee y escribe.
alter table rush_config enable row level security;

insert into rush_config (key, value) values ('ticket_url', '')
on conflict (key) do nothing;
