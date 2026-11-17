-- Auto Engineer: find duplicate parts (Staff > Parts catalog > Duplicates). Staff only.
--   mode 'pn'   : the same part number written differently (dashes, spaces, case)
--   mode 'name' : the same name (same words in any order), optionally inside a search
-- Run once in Supabase > SQL Editor. Safe to run again.

create or replace function public.ae_namekey(t text) returns text
language sql immutable as $$
  select string_agg(w, ' ' order by w)
  from unnest(regexp_split_to_array(lower(regexp_replace(coalesce(t, ''), '[^A-Za-z0-9 ]', '', 'g')), '\s+')) w
  where w <> ''
$$;

create or replace function public.duplicate_parts(mode text default 'pn', q text default '', lim int default 300, off int default 0)
returns table(grp text, gsize bigint, id text, data jsonb, total bigint)
language sql stable security definer set search_path = public as $$
  with base as (
    select d.id, d.data,
           case when mode = 'name' then public.ae_namekey(d.data->>'name') else d.pn end as k
    from docs d
    where d.col = 'parts' and public.my_staff() is not null
      and (coalesce(q, '') = '' or d.hay like '%' || public.ae_txt(q) || '%' or d.pn like public.ae_pn(q) || '%')
  ), g as (
    select k, count(*) as c from base where coalesce(k, '') <> '' group by k having count(*) > 1
  )
  select b.k, g.c, b.id, b.data, count(*) over ()
  from base b join g using (k)
  order by g.c desc, b.k, b.data->>'partNo'
  limit least(coalesce(lim, 300), 1000) offset coalesce(off, 0)
$$;
grant execute on function public.duplicate_parts(text, text, int, int) to authenticated;
