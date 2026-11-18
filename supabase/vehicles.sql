-- Auto Engineer: cars that customers register with "Mohammed, the AI Technician" (Retail room).
-- Saved on the visitor record (Staff > Visitors). Visitors can only call this function; they can never read the list.
-- Run once in Supabase > SQL Editor. Safe to run again.

create or replace function public.track_vehicles(pk text, cars jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare clean jsonb;
begin
  if pk is null or pk !~ '^[0-9]{10,15}$' then return; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', left(coalesce(e->>'id', ''), 24), 'model', left(coalesce(e->>'model', ''), 30), 'modelName', left(coalesce(e->>'modelName', ''), 40),
      'year', left(coalesce(e->>'year', ''), 4), 'fuel', left(coalesce(e->>'fuel', ''), 12), 'engine', left(coalesce(e->>'engine', ''), 6),
      'trans', left(coalesce(e->>'trans', ''), 12), 'spec', left(coalesce(e->>'spec', ''), 24),
      'vin', left(upper(regexp_replace(coalesce(e->>'vin', ''), '[^A-Za-z0-9]', '', 'g')), 17),
      'km', case when coalesce(e->>'km', '') ~ '^[0-9]{1,7}$' then (e->>'km')::int else null end,
      'kmAt', case when coalesce(e->>'kmAt', '') ~ '^[0-9]{1,15}$' then (e->>'kmAt')::bigint else null end,
      'at', case when coalesce(e->>'at', '') ~ '^[0-9]{1,15}$' then (e->>'at')::bigint else null end)), '[]'::jsonb)
    into clean
    from (select e from jsonb_array_elements(case when jsonb_typeof(cars) = 'array' then cars else '[]'::jsonb end) e
          where jsonb_typeof(e) = 'object' limit 5) z;
  update docs set data = data || jsonb_build_object('vehicles', clean, 'lastAt', (extract(epoch from now()) * 1000)::bigint)
  where col = 'visitors' and id = 'v_' || pk;
end $$;

grant execute on function public.track_vehicles(text, jsonb) to anon, authenticated;
