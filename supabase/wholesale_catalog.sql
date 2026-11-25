-- =====================================================================
--  Auto Engineer — separate WHOLESALE catalog
--  Retail and wholesale are two different businesses. Wholesale parts live in their own
--  collection ('wparts'): own part numbers, names, stock and prices. Only Auto Engineer staff
--  and signed-in partner shops can see them; the retail shop never shows them.
--  Requires partners2.sql, stock.sql and wholesale.sql. Run once in Supabase > SQL Editor. Safe to run again.
-- =====================================================================

create index if not exists docs_wparts_pn  on public.docs (public.ae_pn(data->>'partNo') text_pattern_ops) where col = 'wparts';
create index if not exists docs_wparts_hay on public.docs using gin (public.ae_hay(data) gin_trgm_ops) where col = 'wparts';

-- id of a wholesale part from its part number (same rule as the website: w_ + upper case)
create or replace function public.ae_wid(no text) returns text
language sql immutable as $$ select 'w_' || left(regexp_replace(upper(coalesce(no,'')), '[^A-Z0-9_.-]', '_', 'g'), 80) $$;

-- search the wholesale catalog: staff see everything; partner shops see visible parts with THEIR price
create or replace function public.wparts_search(q text default '', lim int default 30, off int default 0, staff boolean default false)
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
    and not exists (select 1 from words where not (public.ae_hay(d.data) like '%' || words.w || '%'
                    or (public.ae_pn(d.data->>'partNo') like public.ae_pn(words.w) || '%' and length(public.ae_pn(words.w)) > 2)))
  order by (public.ae_pn(d.data->>'partNo') = public.ae_pn(q)) desc,
           (coalesce(nullif(d.data->>'qty','')::numeric, 0) > 0) desc, d.data->>'partNo'
  limit least(coalesce(lim, 30), 500) offset coalesce(off, 0);
end $$;
grant execute on function public.wparts_search(text, int, int, boolean) to authenticated;
revoke execute on function public.wparts_search(text, int, int, boolean) from anon;

-- partner prices, offers, back-in-stock alerts and orders now use the wholesale catalog
create or replace function public.partner_prices(ids text[]) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare pid text := public.my_partner(); disc numeric;
begin
  if pid is null then return '{}'::jsonb; end if;
  disc := public.ae_partner_disc(pid);
  return coalesce((select jsonb_object_agg(d.id, public.ae_trade_price(d.data - 'retailPrice', disc))
                   from docs d where d.col = 'wparts' and d.id = any(ids[1:300])
                     and coalesce((d.data->>'hidden')::boolean, false) = false), '{}'::jsonb);
end $$;

create or replace function public.partner_offers() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare pid text := public.my_partner(); disc numeric;
begin
  if pid is null then return '[]'::jsonb; end if;
  disc := public.ae_partner_disc(pid);
  return coalesce((select jsonb_agg(x) from (
    select jsonb_build_object('id', id, 'partNo', data->>'partNo', 'name', data->>'name', 'nameAr', data->>'nameAr', 'nameKu', data->>'nameKu',
      'stock', data->>'stock', 'qty', data->'qty', 'wholesalePrice', data->'wholesalePrice', 'price', public.ae_trade_price(data - 'retailPrice', disc), 'offerNote', data->>'offerNote') x
    from docs where col = 'wparts' and coalesce((data->>'hidden')::boolean,false) = false
      and coalesce(data->>'offerPrice','') ~ '^[0-9.]+$' and (data->>'offerPrice')::numeric > 0
    order by data->>'partNo' limit 500) z), '[]'::jsonb);
end $$;

create or replace function public.partner_notify_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'partId', n.data->>'partId', 'stock', p.data->>'stock', 'qty', p.data->'qty')), '[]'::jsonb)
  from docs n left join docs p on p.col = 'wparts' and p.id = n.data->>'partId'
  where n.col = 'pnotify' and n.data->>'pid' = public.my_partner()
$$;

create or replace function public.partner_place_order(p_lines jsonb, p_pay text, p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare pid text := public.my_partner(); pt jsonb; disc numeric; y int := extract(year from now()); c jsonb; n int; no text;
        lines jsonb := '[]'::jsonb; l jsonb; p jsonb; q int; pr numeric; tot numeric := 0; now_ms bigint := (extract(epoch from now())*1000)::bigint;
begin
  if pid is null then raise exception 'not a partner'; end if;
  if public.my_partner_role() not in ('owner','buyer') then raise exception 'not allowed'; end if;
  select data into pt from docs where col = 'partners' and id = pid;
  disc := public.ae_partner_disc(pid);
  for l in select * from jsonb_array_elements(case when jsonb_typeof(p_lines) = 'array' then p_lines else '[]'::jsonb end) limit 300 loop
    q := case when coalesce(l->>'qty','') ~ '^[0-9]{1,5}$' then (l->>'qty')::int else 0 end;
    if q <= 0 then continue; end if;
    select data into p from docs where col = 'wparts' and id = l->>'partId' and coalesce((data->>'hidden')::boolean,false) = false;
    if p is null then continue; end if;
    pr := public.ae_trade_price(p, disc);
    lines := lines || jsonb_build_array(jsonb_build_object('partId', l->>'partId', 'partNo', p->>'partNo', 'name', p->>'name',
               'nameAr', p->>'nameAr', 'nameKu', p->>'nameKu', 'qty', q, 'price', pr));
    tot := tot + coalesce(pr,0) * q;
  end loop;
  if jsonb_array_length(lines) = 0 then raise exception 'empty order'; end if;
  if p_pay = 'credit' then
    if coalesce((pt->>'creditLimit')::numeric, 0) <= 0 then raise exception 'no credit'; end if;
    if public.ae_balance(pid) + tot > (pt->>'creditLimit')::numeric then raise exception 'credit limit'; end if;
  end if;
  insert into docs(col,id,data) values ('config','pocounter', jsonb_build_object('year', y)) on conflict do nothing;
  select data into c from docs where col = 'config' and id = 'pocounter' for update;
  if (c->>'year')::int is distinct from y then c := jsonb_build_object('year', y); end if;
  n := coalesce((c->>'n')::int, 0) + 1;
  update docs set data = c || jsonb_build_object('n', n), updated_at = now() where col = 'config' and id = 'pocounter';
  no := 'PO-' || y || '-' || lpad(n::text, 4, '0');
  insert into docs(col,id,data) values ('porders', no, jsonb_build_object(
    'pid', pid, 'shop', pt->>'shop', 'phone', pt->>'phone', 'city', pt->>'city',
    'lines', lines, 'total', tot, 'pay', case when p_pay in ('cod','online','credit') then p_pay else 'cod' end,
    'note', left(coalesce(p_note,''), 500), 'status', 'new', 'createdAt', now_ms, 'updatedAt', now_ms,
    'log', jsonb_build_array(jsonb_build_object('at', now_ms, 's', 'new'))));
  return no;
end $$;

-- ---------- daily stock upload for either catalog (p_col = 'parts' retail, 'wparts' wholesale) ----------
drop function if exists public.stock_preview(text[]);
drop function if exists public.stock_apply(jsonb, text);
drop function if exists public.stock_zero_missing(text[], text, int);
drop function if exists public.stock_done(int, int);

create or replace function public.stock_preview(p_keys text[], p_col text default 'parts') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare kx text; r jsonb;
begin
  if coalesce(public.staff_role(),'') not in ('owner','admin','manager') then raise exception 'not allowed'; end if;
  if p_col not in ('parts','wparts') then raise exception 'bad catalog'; end if;
  kx := case when p_col = 'parts' then 'd.pn' else 'public.ae_pn(d.data->>''partNo'')' end;
  execute format($f$
    with k as (select distinct x as k from unnest($1) x where length(x) > 3),
         m as (select k.k, exists(select 1 from docs d where d.col = %L and %s = k.k) f from k)
    select jsonb_build_object(
      'matched', (select count(*) from m where f),
      'unknownCount', (select count(*) from m where not f),
      'unknown', coalesce((select jsonb_agg(z.k) from (select k from m where not f order by k limit 300) z), '[]'::jsonb),
      'missing', (select count(*) from docs d where d.col = %L
                    and (coalesce(nullif(d.data->>'qty','')::numeric, 0) > 0 or d.data->>'stock' = 'In stock')
                    and not exists (select 1 from k where k.k = %s)))$f$, p_col, kx, p_col, kx) into r using p_keys;
  return r;
end $$;

-- rows: [{k: normalised part no, q: qty, w: wholesale price, pn: part number as written, n: name}]
-- wholesale catalog: part numbers that are not there yet are ADDED (retail: skipped)
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
                      max(nullif(trim(x->>'n'),'')) as nm
               from jsonb_array_elements(case when jsonb_typeof($1) = 'array' then $1 else '[]'::jsonb end) x
               where coalesce(x->>'q','') ~ '^-?[0-9]+(\.[0-9]+)?$' group by 1),
         u as (update docs d set data = d.data || jsonb_build_object('qty', r.q, 'stock', case when r.q > 0 then 'In stock' else $2 end)
                                      || case when r.w is not null then jsonb_build_object('wholesalePrice', r.w) else '{}'::jsonb end
                                      || case when %L = 'wparts' and r.nm is not null then jsonb_build_object('name', left(r.nm, 200)) else '{}'::jsonb end,
                                 updated_at = now()
               from r where d.col = %L and %s = r.k
                 and (d.data->'qty' is distinct from to_jsonb(r.q) or d.data->>'stock' is distinct from (case when r.q > 0 then 'In stock' else $2 end)
                      or (r.w is not null and nullif(d.data->>'wholesalePrice','')::numeric is distinct from r.w)
                      or (%L = 'wparts' and r.nm is not null and d.data->>'name' is distinct from left(r.nm, 200)))
               returning 1)
    select count(*) from u$f$, p_col, p_col, kx, p_col) into n using p_rows, zs;
  if p_col = 'wparts' then
    with r as (select x->>'k' as k, max(x->>'pn') as pn, max(greatest(0, floor((x->>'q')::numeric)))::int as q,
                      max(case when coalesce(x->>'w','') ~ '^[0-9]+(\.[0-9]+)?$' and (x->>'w')::numeric > 0 then (x->>'w')::numeric end) as w,
                      max(nullif(trim(x->>'n'),'')) as nm
               from jsonb_array_elements(case when jsonb_typeof(p_rows) = 'array' then p_rows else '[]'::jsonb end) x
               where coalesce(x->>'q','') ~ '^-?[0-9]+(\.[0-9]+)?$' and length(coalesce(x->>'k','')) > 3 group by 1),
         ins as (insert into docs(col, id, data)
               select 'wparts', public.ae_wid(coalesce(nullif(trim(r.pn),''), r.k)),
                      jsonb_strip_nulls(jsonb_build_object('partNo', left(coalesce(nullif(trim(r.pn),''), upper(r.k)), 60), 'name', left(coalesce(r.nm, ''), 200),
                        'qty', r.q, 'stock', case when r.q > 0 then 'In stock' else zs end, 'wholesalePrice', r.w, 'createdAt', now_ms))
               from r where not exists (select 1 from docs d where d.col = 'wparts' and public.ae_pn(d.data->>'partNo') = r.k)
               on conflict (col, id) do nothing returning 1)
    select count(*) into m from ins;
  end if;
  return n + m;
end $$;

create or replace function public.stock_zero_missing(p_keys text[], p_zero_status text, p_lim int default 2000, p_col text default 'parts') returns int
language plpgsql security definer set search_path = public as $$
declare zs text := case when p_zero_status in ('Out of stock','On order','Ask') then p_zero_status else 'On order' end; n int; kx text;
begin
  if coalesce(public.staff_role(),'') not in ('owner','admin','manager') then raise exception 'not allowed'; end if;
  if p_col not in ('parts','wparts') then raise exception 'bad catalog'; end if;
  kx := case when p_col = 'parts' then 'd.pn' else 'public.ae_pn(d.data->>''partNo'')' end;
  execute format($f$
    with k as (select distinct x as k from unnest($1) x),
         t as (select d.col, d.id from docs d where d.col = %L
                 and (coalesce(nullif(d.data->>'qty','')::numeric, 0) > 0 or d.data->>'stock' = 'In stock')
                 and not exists (select 1 from k where k.k = %s) limit $3),
         u as (update docs d set data = d.data || jsonb_build_object('qty', 0, 'stock', $2), updated_at = now()
               from t where d.col = t.col and d.id = t.id returning 1)
    select count(*) from u$f$, p_col, kx) into n using p_keys, zs, least(greatest(coalesce(p_lim,2000),1),5000);
  return n;
end $$;

create or replace function public.stock_done(p_lines int, p_matched int, p_col text default 'parts') returns bigint
language plpgsql security definer set search_path = public as $$
declare now_ms bigint := (extract(epoch from now())*1000)::bigint; w boolean := p_col = 'wparts';
begin
  if coalesce(public.staff_role(),'') not in ('owner','admin','manager') then raise exception 'not allowed'; end if;
  update docs set data = data || jsonb_build_object(case when w then 'wStockUpdatedAt' else 'stockUpdatedAt' end, now_ms), updated_at = now()
   where col = 'config' and id = 'settings';
  insert into docs(col,id,data) values ('config', case when w then 'wstockinfo' else 'stockinfo' end,
      jsonb_build_object('at', now_ms, 'lines', p_lines, 'matched', p_matched, 'by', auth.jwt()->>'email'))
    on conflict (col,id) do update set data = excluded.data, updated_at = now();
  return now_ms;
end $$;

grant execute on function public.stock_preview(text[], text), public.stock_apply(jsonb, text, text),
  public.stock_zero_missing(text[], text, int, text), public.stock_done(int, int, text) to authenticated;
revoke execute on function public.stock_preview(text[], text), public.stock_apply(jsonb, text, text),
  public.stock_zero_missing(text[], text, int, text), public.stock_done(int, int, text) from anon;

select 'wholesale catalog ready' as result;
