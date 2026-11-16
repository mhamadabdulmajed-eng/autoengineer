-- Auto Engineer: visitor phone numbers + search history (for the Staff > Visitors page)
-- Visitors can only call these two functions; they can never read the visitors list.
-- Run once in Supabase > SQL Editor. Safe to run again.

create or replace function public.track_visit(pk text, phone text default '', lang text default '', ua text default '')
returns void language plpgsql security definer set search_path = public as $$
declare now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if pk is null or pk !~ '^[0-9]{10,15}$' then raise exception 'invalid phone'; end if;
  insert into docs(col, id, data) values ('visitors', 'v_' || pk, jsonb_build_object(
      'phone', left(coalesce(phone, ''), 30), 'phoneKey', pk, 'firstAt', now_ms, 'lastAt', now_ms,
      'visits', 1, 'lang', left(coalesce(lang, ''), 5), 'device', left(coalesce(ua, ''), 160),
      'searches', '[]'::jsonb, 'searchCount', 0))
  on conflict (col, id) do update set data = docs.data || jsonb_build_object(
      'lastAt', now_ms, 'lang', left(coalesce(lang, ''), 5), 'device', left(coalesce(ua, ''), 160),
      -- a new visit = more than 30 minutes since the last activity
      'visits', coalesce((docs.data->>'visits')::int, 0)
                + case when now_ms - coalesce((docs.data->>'lastAt')::bigint, 0) > 30 * 60 * 1000 then 1 else 0 end);
end $$;

create or replace function public.track_search(pk text, q text, n int default 0, kind text default 'search')
returns void language plpgsql security definer set search_path = public as $$
declare now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if pk is null or pk !~ '^[0-9]{10,15}$' or coalesce(trim(q), '') = '' then return; end if;
  update docs set data = data || jsonb_build_object(
      'lastAt', now_ms,
      'searchCount', coalesce((data->>'searchCount')::int, 0) + 1,
      -- newest first, keep the last 100
      'searches', (select coalesce(jsonb_agg(e order by i), '[]'::jsonb) from (
          select e, i from jsonb_array_elements(
              jsonb_build_array(jsonb_build_object('q', left(trim(q), 80), 'n', coalesce(n, 0), 'k', left(coalesce(kind, 'search'), 12), 'at', now_ms))
              || coalesce(data->'searches', '[]'::jsonb)) with ordinality a(e, i)
          order by i limit 100) z))
  where col = 'visitors' and id = 'v_' || pk;
end $$;

grant execute on function public.track_visit(text, text, text, text) to anon, authenticated;
grant execute on function public.track_search(text, text, int, text) to anon, authenticated;
