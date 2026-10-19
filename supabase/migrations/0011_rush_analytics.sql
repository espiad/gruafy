-- Analíticas de la landing RUSH × Frankia (activación temporal, AJENA a gruafy).
-- Aislado del resto del esquema: tabla propia, sin relaciones con tablas de gruafy.
-- Para eliminarlo al terminar la activación:
--   drop function if exists rush_stats(timestamptz);
--   drop table if exists rush_events;

create table if not exists rush_events (
  id          bigint generated always as identity primary key,
  event_type  text        not null check (event_type in ('page_view','reveal_click','ticket_click','instagram_click')),
  visitor_id  text        not null check (char_length(visitor_id) between 8 and 64),
  created_at  timestamptz not null default now()
);

create index if not exists rush_events_created_idx on rush_events (created_at);
create index if not exists rush_events_dedup_idx   on rush_events (visitor_id, event_type, created_at desc);

-- RLS activada SIN políticas: nadie con la anon key puede leer ni escribir. Todo
-- pasa por los endpoints del servidor con service role.
alter table rush_events enable row level security;

-- Todas las métricas en una sola consulta. Los días se agrupan en horario de
-- Argentina. "Personas" = visitantes únicos que hicieron esa acción.
create or replace function rush_stats(p_since timestamptz)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with e as (
    select * from rush_events where created_at >= p_since
  )
  select json_build_object(
    'unique_visitors',  (select count(distinct visitor_id) from e),
    'total_visits',     (select count(*) from e where event_type = 'page_view'),
    'reveal_people',    (select count(distinct visitor_id) from e where event_type = 'reveal_click'),
    'ticket_people',    (select count(distinct visitor_id) from e where event_type = 'ticket_click'),
    'instagram_clicks', (select count(*) from e where event_type = 'instagram_click'),
    'instagram_people', (select count(distinct visitor_id) from e where event_type = 'instagram_click'),
    'by_day', (
      select coalesce(json_agg(d order by d.day), '[]'::json)
      from (
        select (created_at at time zone 'America/Argentina/Buenos_Aires')::date as day,
               count(*) filter (where event_type = 'page_view') as visits,
               count(distinct visitor_id) as visitors
        from e
        group by 1
      ) d
    ),
    'last_event_at', (select max(created_at) from e)
  );
$$;

-- La función solo la puede ejecutar el service role (no la anon key).
revoke all on function rush_stats(timestamptz) from public, anon, authenticated;
grant execute on function rush_stats(timestamptz) to service_role;
