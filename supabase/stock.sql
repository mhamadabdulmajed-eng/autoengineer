-- =====================================================================
--  Auto Engineer — daily stock update
--  Staff upload a list of part numbers + quantities (Excel or pasted). Each part gets the
--  quantity; partner shops see the exact quantity, retail customers see In stock / On order.
--  Quantities and partner offers are never sent to retail visitors.
--  Requires parts_search.sql and partners2.sql. Run once in Supabase > SQL Editor. Safe to run again.
-- =====================================================================

-- what an upload would change (nothing is saved)
create or replace function public.stock_preview(p_keys text[]) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(public.staff_role(),'') not in ('owner','admin','manager') then raise exception 'not allowed'; end if;
  return (with k as (select distinct x as k from unnest(p_keys) x where length(x) > 3),
               m as (select k.k, exists(select 1 from docs d where d.col = 'parts' and d.pn = k.k) f from k)
    select jsonb_build_object(
      'matched', (select count(*) from m where f),
      'unknownCount', (select count(*) from m where not f),
      'unknown', coalesce((select jsonb_agg(z.k) from (select k from m where not f order by k limit 300) z), '[]'::jsonb),
      'missing', (select count(*) from docs d where d.col = 'parts'
                    and (coalesce(nullif(d.data->>'qty','')::numeric, 0) > 0 or d.data->>'stock' = 'In stock')
                    and not exists (select 1 from k where k.k = d.pn))));
end $$;

-- save quantities for a batch of lines: [{k: normalised part number, q: quantity}]
create or replace function public.stock_apply(p_rows jsonb, p_zero_status text) returns int
language plpgsql security definer set search_path = public as $$
declare zs text := case when p_zero_status in ('Out of stock','On order','Ask') then p_zero_status else 'On order' end; n int;
begin
  if coalesce(public.staff_role(),'') not in ('owner','admin','manager') then raise exception 'not allowed'; end if;
  with r as (select x->>'k' as k, max(greatest(0, floor((x->>'q')::numeric)))::int as q
             from jsonb_array_elements(case when jsonb_typeof(p_rows) = 'array' then p_rows else '[]'::jsonb end) x
             where coalesce(x->>'q','') ~ '^-?[0-9]+(\.[0-9]+)?$' group by 1),
       u as (update docs d set data = d.data || jsonb_build_object('qty', r.q, 'stock', case when r.q > 0 then 'In stock' else zs end), updated_at = now()
             from r where d.col = 'parts' and d.pn = r.k
               and (d.data->'qty' is distinct from to_jsonb(r.q) or d.data->>'stock' is distinct from (case when r.q > 0 then 'In stock' else zs end))
             returning 1)
  select count(*) into n from u;
  return n;
end $$;

-- parts that are NOT in today's list go to 0 (in batches; call again until it returns less than p_lim)
create or replace function public.stock_zero_missing(p_keys text[], p_zero_status text, p_lim int default 2000) returns int
language plpgsql security definer set search_path = public as $$
declare zs text := case when p_zero_status in ('Out of stock','On order','Ask') then p_zero_status else 'On order' end; n int;
begin
  if coalesce(public.staff_role(),'') not in ('owner','admin','manager') then raise exception 'not allowed'; end if;
  with k as (select distinct x as k from unnest(p_keys) x),
       t as (select d.col, d.id from docs d where d.col = 'parts'
               and (coalesce(nullif(d.data->>'qty','')::numeric, 0) > 0 or d.data->>'stock' = 'In stock')
               and not exists (select 1 from k where k.k = d.pn) limit least(greatest(coalesce(p_lim,2000),1),5000)),
       u as (update docs d set data = d.data || jsonb_build_object('qty', 0, 'stock', zs), updated_at = now()
             from t where d.col = t.col and d.id = t.id returning 1)
  select count(*) into n from u;
  return n;
end $$;

-- remember when stock was last updated (shown to partners as "Stock updated …")
create or replace function public.stock_done(p_lines int, p_matched int) returns bigint
language plpgsql security definer set search_path = public as $$
declare now_ms bigint := (extract(epoch from now())*1000)::bigint;
begin
  if coalesce(public.staff_role(),'') not in ('owner','admin','manager') then raise exception 'not allowed'; end if;
  update docs set data = data || jsonb_build_object('stockUpdatedAt', now_ms), updated_at = now() where col = 'config' and id = 'settings';
  insert into docs(col,id,data) values ('config','stockinfo', jsonb_build_object('at', now_ms, 'lines', p_lines, 'matched', p_matched, 'by', auth.jwt()->>'email'))
    on conflict (col,id) do update set data = excluded.data, updated_at = now();
  return now_ms;
end $$;

grant execute on function public.stock_preview(text[]), public.stock_apply(jsonb,text), public.stock_zero_missing(text[],text,int), public.stock_done(int,int) to authenticated;
revoke execute on function public.stock_preview(text[]), public.stock_apply(jsonb,text), public.stock_zero_missing(text[],text,int), public.stock_done(int,int) from anon;

-- ---------- keep quantities and partner offers away from retail visitors ----------
create or replace view public.public_parts as
  select col, id, (data - 'wholesalePrice' - 'qty' - 'offerPrice' - 'offerNote') as data
  from public.docs
  where col = 'parts' and coalesce((data->>'hidden')::boolean, false) = false;
grant select on public.public_parts to anon, authenticated;

create or replace function public.part_page(p_no text) returns jsonb
language sql stable security definer set search_path = public as $$
  select (d.data - 'wholesalePrice' - 'desc' - 'qty' - 'offerPrice' - 'offerNote') || jsonb_build_object('id', d.id)
  from docs d
  where d.col = 'parts' and d.pn = public.ae_pn(p_no)
    and coalesce((d.data->>'hidden')::boolean, false) = false
  order by length(d.data->>'partNo')
  limit 1
$$;

-- partner offers now include the quantity
create or replace function public.partner_offers() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare pid text := public.my_partner(); disc numeric;
begin
  if pid is null then return '[]'::jsonb; end if;
  disc := public.ae_partner_disc(pid);
  return coalesce((select jsonb_agg(x) from (
    select jsonb_build_object('id', id, 'partNo', data->>'partNo', 'name', data->>'name', 'nameAr', data->>'nameAr', 'nameKu', data->>'nameKu',
      'stock', data->>'stock', 'qty', data->'qty', 'price', public.ae_trade_price(data, disc), 'offerNote', data->>'offerNote') x
    from docs where col = 'parts' and coalesce((data->>'hidden')::boolean,false) = false
      and coalesce(data->>'offerPrice','') ~ '^[0-9.]+$' and (data->>'offerPrice')::numeric > 0
    order by data->>'partNo' limit 500) z), '[]'::jsonb);
end $$;

-- ---------- parts search: staff see everything, partner shops also see quantities, retail sees neither ----------
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
  ), st as (select (staff and public.my_staff() is not null) as on_, public.my_staff() is not null as stf, public.my_partner() is not null as ptn), p as (
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
         case when st.stf then p.data when st.ptn then p.data - 'wholesalePrice'
              else p.data - 'wholesalePrice' - 'qty' - 'offerPrice' - 'offerNote' end,
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

select 'stock update ready' as result;
