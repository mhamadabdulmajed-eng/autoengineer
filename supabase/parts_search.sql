-- Auto Engineer: fast server-side parts search for large catalogs (60,000+ parts).
-- Run once in Supabase > SQL Editor. Safe to run again.

create extension if not exists pg_trgm;

-- letters/digits only, lower case (for part numbers: "04465-0K290" -> "044650k290")
create or replace function public.ae_pn(t text) returns text
language sql immutable as $$ select lower(regexp_replace(coalesce(t,''), '[^[:alnum:]]', '', 'g')) $$;

-- lower case + unify Arabic/Kurdish letter variants so spelling differences still match
create or replace function public.ae_txt(t text) returns text
language sql immutable as $$
  select translate(lower(coalesce(t,'')), 'أإآىيةكۆێڵڕ', 'اااییهکویلر')
$$;

-- everything a customer might type, in one searchable string
create or replace function public.ae_hay(d jsonb) returns text
language sql immutable as $$
  select public.ae_txt(concat_ws(' ', d->>'partNo', d->>'name', d->>'nameAr', d->>'nameKu', d->>'desc', d->>'category', d->>'model'))
         || ' ' || public.ae_pn(d->>'partNo')
$$;

-- pre-computed search columns (filled automatically on every insert/update)
alter table public.docs add column if not exists hay text generated always as (case when col = 'parts' then public.ae_hay(data) end) stored;
alter table public.docs add column if not exists pn  text generated always as (case when col = 'parts' then public.ae_pn(data->>'partNo') end) stored;
create index if not exists docs_parts_hay on public.docs using gin (hay gin_trgm_ops) where col = 'parts';
create index if not exists docs_parts_pn  on public.docs (pn text_pattern_ops) where col = 'parts';
create index if not exists docs_parts_cat on public.docs ((data->>'category')) where col = 'parts';

-- q:    words typed by the customer (all must match)
-- anyw: optional list of alternative words (any one must match), used by Find My Part quick buttons
drop function if exists public.search_parts(text, text, text, int, text[], int, int);
drop function if exists public.search_parts(text, text, text, int, text[], int, int, boolean);
create or replace function public.search_parts(
  q text default '', cat text default '', model text default '', yr int default null,
  anyw text[] default null, lim int default 60, off int default 0, staff boolean default false)
returns table(id text, data jsonb, total bigint)
language sql stable security definer set search_path = public as $$
  with words as (
    select w from unnest(string_to_array(public.ae_txt(trim(coalesce(q,''))), ' ')) w where length(w) > 0
  ), p as (
    select d.id, d.data, d.hay, d.pn
    from docs d
    where d.col = 'parts'
      -- hidden parts: only staff see them (in Staff > Parts catalog)
      and (coalesce((d.data->>'hidden')::boolean, false) = false or (staff and public.my_staff() is not null))
      and (coalesce(cat,'') = '' or d.data->>'category' = cat)
      and (coalesce(model,'') = '' or coalesce(d.data->>'modelId','') in ('', '*', model))
      and (yr is null or ((d.data->>'yearFrom') is null or (d.data->>'yearFrom')::int <= yr)
                      and ((d.data->>'yearTo')   is null or (d.data->>'yearTo')::int   >= yr))
  )
  select p.id,
         case when public.my_staff() is not null then p.data else p.data - 'wholesalePrice' end,
         count(*) over ()
  from p
  where not exists (select 1 from words where not (p.hay like '%' || words.w || '%' or p.pn like public.ae_pn(words.w) || '%' and length(public.ae_pn(words.w)) > 2))
    and (anyw is null or exists (select 1 from unnest(anyw) a where p.hay like '%' || public.ae_txt(a) || '%'))
  order by (p.pn = public.ae_pn(q)) desc, (p.pn like public.ae_pn(q) || '%' and length(public.ae_pn(q)) > 2) desc,
           -- names that start with what was typed come first, then shorter (simpler) names
           (coalesce(q,'') <> '' and (public.ae_txt(p.data->>'nameAr') like public.ae_txt(q) || '%'
              or public.ae_txt(p.data->>'nameKu') like public.ae_txt(q) || '%' or lower(p.data->>'name') like lower(q) || '%')) desc,
           length(p.data->>'name'), p.data->>'name'
  limit least(coalesce(lim,60), 500) offset coalesce(off,0)
$$;
grant execute on function public.search_parts(text, text, text, int, text[], int, int, boolean) to anon, authenticated;

-- count of parts (for the home page stats)
create or replace function public.parts_count() returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from docs where col = 'parts' and coalesce((data->>'hidden')::boolean, false) = false
$$;
grant execute on function public.parts_count() to anon, authenticated;
