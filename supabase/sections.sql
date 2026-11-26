-- =====================================================================
--  Auto Engineer — wholesale SECTIONS and BRANDS
--  Wholesale parts can carry a section (e.g. Oils & lubricants, Aftermarket parts, Bearings,
--  Electrical, Tools…) and a brand. Partners browse by section and search by brand.
--  The daily wholesale upload can carry Brand and Section columns.
--  Requires wholesale_catalog.sql. Run once in Supabase > SQL Editor. Safe to run again.
-- =====================================================================

-- search text for wholesale parts: name, numbers, category + brand and section
create or replace function public.ae_whay(d jsonb) returns text
language sql immutable as $$ select public.ae_hay(d) || ' ' || public.ae_txt(concat_ws(' ', d->>'brand', d->>'section')) $$;
create index if not exists docs_wparts_whay on public.docs using gin (public.ae_whay(data) gin_trgm_ops) where col = 'wparts';

drop function if exists public.wparts_search(text, int, int, boolean);
create or replace function public.wparts_search(q text default '', lim int default 30, off int default 0, staff boolean default false,
                                                sec text default '', brand text default '')
returns table(id text, data jsonb, price numeric, total bigint)
language plpgsql stable security definer set search_path = public as $$
declare stf boolean := public.my_staff() is not null; pid text := public.my_partner(); disc numeric := 0;
begin
  if not stf and pid is null then return; end if;
  if pid is not null and not stf then disc := public.ae_partner_disc(pid); end if;
  return query
  with words as (select w from unnest(string_to_array(public.ae_txt(trim(coalesce(q,''))), ' ')) w where length(w) > 0)
  select d.id,
         case when stf then d.data else d.data - 'cost' end,
         case when stf and staff then nullif(d.data->>'wholesalePrice','')::numeric else public.ae_trade_price(d.data - 'retailPrice', disc) end,
         count(*) over ()
  from docs d
  where d.col = 'wparts'
    and (stf and staff or coalesce((d.data->>'hidden')::boolean, false) = false)
    and (coalesce(sec,'') = '' or (sec = '-' and coalesce(d.data->>'section','') = '') or lower(d.data->>'section') = lower(sec))
    and (coalesce(brand,'') = '' or lower(d.data->>'brand') = lower(brand))
    and not exists (select 1 from words where not (public.ae_whay(d.data) like '%' || words.w || '%'
                    or (public.ae_pn(d.data->>'partNo') like public.ae_pn(words.w) || '%' and length(public.ae_pn(words.w)) > 2)))
  order by (public.ae_pn(d.data->>'partNo') = public.ae_pn(q)) desc,
           (coalesce(nullif(d.data->>'qty','')::numeric, 0) > 0) desc, d.data->>'partNo'
  limit least(coalesce(lim, 30), 500) offset coalesce(off, 0);
end $$;
grant execute on function public.wparts_search(text, int, int, boolean, text, text) to authenticated;
revoke execute on function public.wparts_search(text, int, int, boolean, text, text) from anon;

-- sections and brands in the wholesale catalog, with counts (for the filter chips)
create or replace function public.wparts_facets() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_staff() is null and public.my_partner() is null then return null; end if;
  return jsonb_build_object(
    'sections', coalesce((select jsonb_object_agg(s, n) from (select coalesce(nullif(data->>'section',''),'-') s, count(*) n from docs
                 where col = 'wparts' and coalesce((data->>'hidden')::boolean,false) = false group by 1) x), '{}'::jsonb),
    'brands', coalesce((select jsonb_agg(jsonb_build_object('b', b, 'n', n) order by n desc) from (select data->>'brand' b, count(*) n from docs
                 where col = 'wparts' and coalesce(data->>'brand','') <> '' and coalesce((data->>'hidden')::boolean,false) = false group by 1 order by 2 desc limit 60) x), '[]'::jsonb));
end $$;
grant execute on function public.wparts_facets() to authenticated;
revoke execute on function public.wparts_facets() from anon;

-- wholesale upload: rows may also carry brand (b) and section (s)
create or replace function public.stock_apply(p_rows jsonb, p_zero_status text, p_col text default 'parts') returns int
language plpgsql security definer set search_path = public as $$
declare zs text := case when p_zero_status in ('Out of stock','On order','Ask') then p_zero_status else 'On order' end; n int; m int := 0;
        kx text; now_ms bigint := (extract(epoch from now())*1000)::bigint;
begin
  if coalesce(public.staff_role(),'') not in ('owner','admin','manager') then raise exception 'not allowed'; end if;
  if p_col not in ('parts','wparts') then raise exception 'bad catalog'; end if;
  kx := case when p_col = 'parts' then 'd.pn' else 'public.ae_pn(d.data->>''partNo'')' end;
  execute format($f$
    with r as (select x->>'k' as k, max(greatest(0, floor((x->>'q')::numeric)))::int as q,
                      max(case when coalesce(x->>'w','') ~ '^[0-9]+(\.[0-9]+)?$' and (x->>'w')::numeric > 0 then (x->>'w')::numeric end) as w,
                      max(nullif(trim(x->>'n'),'')) as nm, max(nullif(trim(x->>'b'),'')) as br, max(nullif(trim(x->>'s'),'')) as sec
               from jsonb_array_elements(case when jsonb_typeof($1) = 'array' then $1 else '[]'::jsonb end) x
               where coalesce(x->>'q','') ~ '^-?[0-9]+(\.[0-9]+)?$' group by 1),
         u as (update docs d set data = d.data || jsonb_build_object('qty', r.q, 'stock', case when r.q > 0 then 'In stock' else $2 end)
                                      || case when r.w is not null then jsonb_build_object('wholesalePrice', r.w) else '{}'::jsonb end
                                      || case when %L = 'wparts' and r.nm is not null then jsonb_build_object('name', left(r.nm, 200)) else '{}'::jsonb end
                                      || case when %L = 'wparts' and r.br is not null then jsonb_build_object('brand', left(r.br, 60)) else '{}'::jsonb end
                                      || case when %L = 'wparts' and r.sec is not null then jsonb_build_object('section', left(r.sec, 60)) else '{}'::jsonb end,
                                 updated_at = now()
               from r where d.col = %L and %s = r.k
                 and (d.data->'qty' is distinct from to_jsonb(r.q) or d.data->>'stock' is distinct from (case when r.q > 0 then 'In stock' else $2 end)
                      or (r.w is not null and nullif(d.data->>'wholesalePrice','')::numeric is distinct from r.w)
                      or (%L = 'wparts' and r.nm is not null and d.data->>'name' is distinct from left(r.nm, 200))
                      or (%L = 'wparts' and r.br is not null and d.data->>'brand' is distinct from left(r.br, 60))
                      or (%L = 'wparts' and r.sec is not null and d.data->>'section' is distinct from left(r.sec, 60)))
               returning 1)
    select count(*) from u$f$, p_col, p_col, p_col, p_col, kx, p_col, p_col, p_col) into n using p_rows, zs;
  if p_col = 'wparts' then
    with r as (select x->>'k' as k, max(x->>'pn') as pn, max(greatest(0, floor((x->>'q')::numeric)))::int as q,
                      max(case when coalesce(x->>'w','') ~ '^[0-9]+(\.[0-9]+)?$' and (x->>'w')::numeric > 0 then (x->>'w')::numeric end) as w,
                      max(nullif(trim(x->>'n'),'')) as nm, max(nullif(trim(x->>'b'),'')) as br, max(nullif(trim(x->>'s'),'')) as sec
               from jsonb_array_elements(case when jsonb_typeof(p_rows) = 'array' then p_rows else '[]'::jsonb end) x
               where coalesce(x->>'q','') ~ '^-?[0-9]+(\.[0-9]+)?$' and length(coalesce(x->>'k','')) > 3 group by 1),
         ins as (insert into docs(col, id, data)
               select 'wparts', public.ae_wid(coalesce(nullif(trim(r.pn),''), r.k)),
                      jsonb_strip_nulls(jsonb_build_object('partNo', left(coalesce(nullif(trim(r.pn),''), upper(r.k)), 60), 'name', left(coalesce(r.nm, ''), 200),
                        'qty', r.q, 'stock', case when r.q > 0 then 'In stock' else zs end, 'wholesalePrice', r.w, 'brand', left(r.br, 60), 'section', left(r.sec, 60), 'createdAt', now_ms))
               from r where not exists (select 1 from docs d where d.col = 'wparts' and public.ae_pn(d.data->>'partNo') = r.k)
               on conflict (col, id) do nothing returning 1)
    select count(*) into m from ins;
  end if;
  return n + m;
end $$;

select 'wholesale sections ready' as result;
