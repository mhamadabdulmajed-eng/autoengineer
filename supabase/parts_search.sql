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

-- shop order (customers): engine oil first, then oil filters, then brake pads, then everything else;
-- inside each group the cheapest comes first and "price on request" goes last
create or replace function public.ae_shop_rank(d jsonb) returns int
language sql immutable as $$
  select case
    when n ~ '(engine oil|motor oil|tgmo|lgmo)' and n !~ '(pan|seal|cooler|pump|cap|level|gage|gauge|dipstick|filter|hose|pipe|tube|strainer|jet|switch|sensor|bolt|plug|gasket)' then 0
    when n ~ 'oil filter|filter oil' and n !~ '(bracket|cap|gasket|union|wrench|cover|housing|bolt|stud|seal|hose|pipe|tube|plug|o ring|ring|tool)' then 1
    when n ~ '(brake pad|pad kit.*brake|brake.*pad kit)' and n !~ '(shim|support|clip|indicator|fitting|spring|pin|sensor|guide|retainer)' then 2
    else 3 end
  from (select lower(concat_ws(' ', d->>'name', d->>'desc')) as n) x
$$;

-- q:    words typed by the customer (all must match)
-- anyw: optional list of alternative words (any one must match), used by Find My Part quick buttons
drop function if exists public.search_parts(text, text, text, int, text[], int, int);
drop function if exists public.search_parts(text, text, text, int, text[], int, int, boolean);
drop function if exists public.search_parts(text, text, text, int, text[], int, int, boolean, text, numeric, numeric, text, text, text);
-- staff-only filters (Staff > Parts catalog): stk = stock, pmin/pmax = retail price range,
-- vis = '' | 'shown' | 'hidden', price = '' | 'has' | 'none', sort = '' | pn | name | cat | stock | price_asc | price_desc
create or replace function public.search_parts(
  q text default '', cat text default '', model text default '', yr int default null,
  anyw text[] default null, lim int default 60, off int default 0, staff boolean default false,
  stk text default '', pmin numeric default null, pmax numeric default null,
  vis text default '', price text default '', sort text default '')
returns table(id text, data jsonb, total bigint)
language sql stable security definer set search_path = public as $$
  with words as (
    select w from unnest(string_to_array(public.ae_txt(trim(coalesce(q,''))), ' ')) w where length(w) > 0
  ), st as (select (staff and public.my_staff() is not null) as on_), p as (
    select d.id, d.data, d.hay, d.pn, nullif(d.data->>'retailPrice', '')::numeric as rp,
           coalesce((d.data->>'hidden')::boolean, false) as hid
    from docs d
    where d.col = 'parts'
      and (coalesce(cat,'') = '' or d.data->>'category' = cat)
      and (coalesce(model,'') = '' or coalesce(d.data->>'modelId','') in ('', '*', model))
      and (yr is null or ((d.data->>'yearFrom') is null or (d.data->>'yearFrom')::int <= yr)
                      and ((d.data->>'yearTo')   is null or (d.data->>'yearTo')::int   >= yr))
      and (coalesce(stk,'') = '' or coalesce(d.data->>'stock','Ask') = stk)
  )
  select p.id,
         case when public.my_staff() is not null then p.data else p.data - 'wholesalePrice' end,
         count(*) over ()
  from p, st
  where (not p.hid or (st.on_ and coalesce(vis,'') <> 'shown'))
    and (not st.on_ or coalesce(vis,'') <> 'hidden' or p.hid)
    and (pmin is null or p.rp >= pmin) and (pmax is null or p.rp <= pmax)
    and (coalesce(price,'') = '' or (price = 'has' and p.rp is not null) or (price = 'none' and p.rp is null))
    and not exists (select 1 from words where not (p.hay like '%' || words.w || '%' or p.pn like public.ae_pn(words.w) || '%' and length(public.ae_pn(words.w)) > 2))
    and (anyw is null or exists (select 1 from unnest(anyw) a where p.hay like '%' || public.ae_txt(a) || '%'))
  order by
    case when sort = 'price_asc'  then p.rp end asc nulls last,
    case when sort = 'price_desc' then p.rp end desc nulls last,
    case when sort = 'pn'    then p.data->>'partNo'   end,
    case when sort = 'name'  then p.data->>'name'     end,
    case when sort = 'cat'   then p.data->>'category' end,
    case when sort = 'stock' then p.data->>'stock'    end,
    (p.pn = public.ae_pn(q)) desc, (p.pn like public.ae_pn(q) || '%' and length(public.ae_pn(q)) > 2) desc,
    -- customers: oil, oil filter, brake pads first, then the rest from lowest to highest price
    case when not st.on_ and coalesce(sort,'') = '' then public.ae_shop_rank(p.data) end asc nulls last,
    case when not st.on_ and coalesce(sort,'') = '' then p.rp end asc nulls last,
    -- names that start with what was typed come first, then shorter (simpler) names
    (coalesce(q,'') <> '' and (public.ae_txt(p.data->>'nameAr') like public.ae_txt(q) || '%'
       or public.ae_txt(p.data->>'nameKu') like public.ae_txt(q) || '%' or lower(p.data->>'name') like lower(q) || '%')) desc,
    length(p.data->>'name'), p.data->>'name'
  limit least(coalesce(lim,60), 500) offset coalesce(off,0)
$$;
grant execute on function public.search_parts(text, text, text, int, text[], int, int, boolean, text, numeric, numeric, text, text, text) to anon, authenticated;

-- count of parts (for the home page stats)
create or replace function public.parts_count() returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from docs where col = 'parts' and coalesce((data->>'hidden')::boolean, false) = false
$$;
grant execute on function public.parts_count() to anon, authenticated;
